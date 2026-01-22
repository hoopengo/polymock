from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.deps import get_current_user
from src.db.session import get_db
from src.models.market import Market
from src.models.user import User
from src.schemas.market import (
    BuyRequest,
    BuyResponse,
    MarketCreate,
    MarketListResponse,
    MarketResponse,
)
from src.services.market_service import (
    InsufficientBalanceError,
    MarketNotFoundError,
    MarketResolvedError,
    MarketService,
    UserNotFoundError,
)

router = APIRouter(prefix="/markets", tags=["markets"])


def _market_to_response(market: Market, service: MarketService) -> MarketResponse:
    """Convert Market model to MarketResponse with computed probabilities."""
    prob_yes, prob_no = service.calculate_probabilities(market)
    return MarketResponse(
        id=market.id,
        question=market.question,
        description=market.description,
        end_date=market.end_date,
        pool_yes=market.pool_yes,
        pool_no=market.pool_no,
        is_resolved=market.is_resolved,
        outcome=market.outcome,
        resolution_source=market.resolution_source,
        prob_yes=prob_yes,
        prob_no=prob_no,
    )


@router.get("", response_model=MarketListResponse)
async def list_markets(db: AsyncSession = Depends(get_db)) -> MarketListResponse:
    """
    List all active (unresolved) markets.

    Returns markets ordered by most recent first, with computed probabilities.
    """
    service = MarketService(db)
    markets = await service.get_active_markets()

    market_responses = [_market_to_response(m, service) for m in markets]

    return MarketListResponse(
        markets=market_responses,
        total=len(market_responses),
    )


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(
    market_id: int,
    db: AsyncSession = Depends(get_db),
) -> MarketResponse:
    """
    Get a single market by ID with current prices/probabilities.
    """
    service = MarketService(db)
    market = await service.get_market(market_id)

    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market with id {market_id} not found",
        )

    return _market_to_response(market, service)


@router.post("", response_model=MarketResponse, status_code=status.HTTP_201_CREATED)
async def create_market(
    market_data: MarketCreate,
    db: AsyncSession = Depends(get_db),
) -> MarketResponse:
    """
    Create a new prediction market.

    The market will be initialized with equal liquidity in both YES and NO pools.
    """
    service = MarketService(db)
    try:
        market = await service.create_market(
            question=market_data.question,
            description=market_data.description,
            end_date=market_data.end_date,
            initial_pool=market_data.initial_pool,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return _market_to_response(market, service)


@router.post("/{market_id}/buy", response_model=BuyResponse)
async def buy_shares(
    market_id: int,
    buy_request: BuyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BuyResponse:
    """
    Buy shares in a market (requires authentication).

    Uses simplified parimutuel/CPMM formula:
    - Effective_Price = Pool_Counter / (Pool_Target + Pool_Counter + Amount)
    - Shares = Amount / Effective_Price

    The user's balance is deducted and their position is updated.
    """
    service = MarketService(db)

    try:
        trade_result = await service.buy_shares(
            user_id=current_user.id,
            market_id=market_id,
            outcome=buy_request.outcome,
            amount=buy_request.amount,
        )
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except MarketNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except MarketResolvedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except InsufficientBalanceError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(e),
        )

    return BuyResponse(**trade_result)
