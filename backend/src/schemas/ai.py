"""AI-related schemas for market generation."""

from datetime import datetime

from pydantic import BaseModel, Field


class MarketCreateTool(BaseModel):
    """Schema for AI-generated market creation.

    This schema is used by the instructor library to enforce
    structured output from the LLM.
    """

    question: str = Field(
        ...,
        description="The prediction market question, e.g., 'Will BTC exceed $100k by Jan 2025?'",
        max_length=500,
    )
    description: str = Field(
        ...,
        description="Detailed description of the market, including context and resolution criteria",
    )
    end_date: datetime = Field(
        ...,
        description="The date when the market will be resolved",
    )
    resolution_source: str = Field(
        ...,
        description="The authoritative source for market resolution, e.g., 'CoinGecko API'",
        max_length=500,
    )
