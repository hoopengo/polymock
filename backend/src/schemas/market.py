from datetime import datetime

from pydantic import BaseModel, Field


class MarketCreate(BaseModel):
    """Request schema for creating a new market."""

    question: str = Field(..., max_length=500)
    description: str
    end_date: datetime
    initial_pool: float = Field(default=100.0, gt=0)


class MarketResponse(BaseModel):
    """Response schema for market data with computed probabilities."""

    id: int
    question: str
    description: str
    end_date: datetime
    pool_yes: float
    pool_no: float
    is_resolved: bool
    outcome: bool | None
    resolution_source: str | None

    # Computed probabilities
    prob_yes: float
    prob_no: float

    model_config = {"from_attributes": True}


class BuyRequest(BaseModel):
    """Request schema for buying shares."""

    user_id: int
    amount: float = Field(..., gt=0)
    outcome: bool  # True = YES, False = NO


class BuyResponse(BaseModel):
    """Response schema after a successful trade."""

    market_id: int
    user_id: int
    outcome: bool
    amount_spent: float
    shares_received: float
    effective_price: float
    new_prob_yes: float
    new_prob_no: float


class PositionResponse(BaseModel):
    """Response schema for user position in a market."""

    id: int
    user_id: int
    market_id: int
    shares_yes: float
    shares_no: float

    model_config = {"from_attributes": True}


class MarketListResponse(BaseModel):
    """Response schema for listing markets."""

    markets: list[MarketResponse]
    total: int
