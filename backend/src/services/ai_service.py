"""AI Service for generating prediction markets from news."""

import logging
from datetime import datetime

import httpx
import instructor
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import settings
from src.db.session import SessionLocal
from src.models.market import Market
from src.schemas.ai import MarketCreateTool
from src.services.market_service import MarketService
from thefuzz import fuzz

logger = logging.getLogger(__name__)

# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "mistralai/devstral-2512:free"


def get_instructor_client() -> instructor.Instructor | None:
    """Create an instructor-patched OpenAI client for OpenRouter.

    Returns:
        Instructor client if API key is configured, None otherwise.
    """
    if not settings.OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not set. AI service will not function.")
        return None

    openai_client = AsyncOpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
    )

    return instructor.from_openai(openai_client)


async def fetch_crypto_price() -> dict:
    """Fetch current cryptocurrency prices from CoinGecko.

    Returns:
        Dict with price data for major cryptocurrencies.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,solana",
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch crypto prices: {e}")
        # Return mock data on failure
        return {
            "bitcoin": {"usd": 100000, "usd_24h_change": 2.5},
            "ethereum": {"usd": 3500, "usd_24h_change": 1.8},
            "solana": {"usd": 200, "usd_24h_change": 5.2},
        }


def is_duplicate_market(
    new_question: str,
    existing_questions: list[str],
    threshold: int = 80,
) -> bool:
    """Check if a market question is too similar to existing ones.

    Uses fuzzy string matching to detect near-duplicates.

    Args:
        new_question: The new market question to check.
        existing_questions: List of existing market questions.
        threshold: Similarity threshold (0-100). Default 80.

    Returns:
        True if a similar market exists, False otherwise.
    """
    new_q_lower = new_question.lower()
    for existing in existing_questions:
        similarity = fuzz.ratio(new_q_lower, existing.lower())
        if similarity >= threshold:
            logger.info(
                f"Duplicate detected (similarity={similarity}%): "
                f"'{new_question}' ~ '{existing}'"
            )
            return True
    return False


async def generate_market_from_news(news_text: str) -> MarketCreateTool | None:
    """Generate a prediction market from news text using LLM.

    Args:
        news_text: The news content to generate a market from.

    Returns:
        MarketCreateTool schema if successful, None otherwise.
    """
    client = get_instructor_client()
    if client is None:
        return None

    try:
        market = await client.chat.completions.create(
            model=OPENROUTER_MODEL,
            response_model=MarketCreateTool,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert at creating prediction markets. "
                        "Given news or price data, create an interesting and specific "
                        "prediction market question. The question should be binary "
                        "(YES/NO resolvable), time-bound, and verifiable. "
                        "Set the end_date to a reasonable future date based on the news context. "
                        "The resolution_source should specify how the outcome will be verified."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Create a prediction market based on this news:\n\n{news_text}",
                },
            ],
            max_tokens=500,
        )
        return market
    except Exception as e:
        logger.error(f"Failed to generate market from LLM: {e}")
        return None


async def get_existing_market_questions(db: AsyncSession) -> list[str]:
    """Get all existing market questions from the database.

    Args:
        db: Database session.

    Returns:
        List of market question strings.
    """
    result = await db.execute(select(Market.question))
    return [row[0] for row in result.fetchall()]


async def run_market_generation_job() -> None:
    """Main scheduled job for generating markets from crypto news.

    This function:
    1. Fetches current crypto prices
    2. Generates a market question using AI
    3. Checks for duplicates using fuzzy matching
    4. Saves the new market to the database if unique
    """
    logger.info("Starting market generation job...")

    # Check if API key is configured
    if not settings.OPENROUTER_API_KEY:
        logger.warning("Skipping market generation: OPENROUTER_API_KEY not configured")
        return

    try:
        # Fetch crypto price data
        price_data = await fetch_crypto_price()

        # Format news text from price data
        news_text = _format_price_news(price_data)
        logger.info(f"Generated news: {news_text}")

        # Generate market using AI
        market_data = await generate_market_from_news(news_text)
        if market_data is None:
            logger.error("Failed to generate market from AI")
            return

        logger.info(f"AI generated market: {market_data.question}")

        # Check for duplicates in database
        async with SessionLocal() as db:
            existing_questions = await get_existing_market_questions(db)

            if is_duplicate_market(market_data.question, existing_questions):
                logger.info("Market is a duplicate, skipping creation")
                return

            # Create new market using MarketService
            market_service = MarketService(db)
            new_market = await market_service.create_market(
                question=market_data.question,
                description=market_data.description,
                end_date=market_data.end_date,
                initial_pool=100.0,
            )

            # Update resolution_source (not part of create_market)
            new_market.resolution_source = market_data.resolution_source
            await db.commit()

            logger.info(f"Created new market with ID: {new_market.id}")

    except Exception as e:
        logger.exception(f"Error in market generation job: {e}")


def _format_price_news(price_data: dict) -> str:
    """Format price data into a news-like text.

    Args:
        price_data: Dict from CoinGecko API.

    Returns:
        Formatted news string.
    """
    lines = [
        f"Cryptocurrency Market Update ({datetime.utcnow().strftime('%Y-%m-%d')}):\n"
    ]

    for coin, data in price_data.items():
        price = data.get("usd", 0)
        change = data.get("usd_24h_change", 0)
        direction = "up" if change > 0 else "down"
        lines.append(
            f"- {coin.capitalize()}: ${price:,.2f} ({direction} {abs(change):.1f}% in 24h)"
        )

    return "\n".join(lines)
