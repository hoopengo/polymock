"""Admin-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class UserUpdate(BaseModel):
    """Schema for updating a user (admin only)."""

    balance: float | None = Field(default=None, ge=0)
    is_admin: bool | None = None


class UserResponse(BaseModel):
    """Schema for user data in admin responses."""

    id: int
    username: str
    balance: float
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Schema for listing users."""

    users: list[UserResponse]
    total: int


class MarketUpdate(BaseModel):
    """Schema for updating a market (admin only)."""

    question: str | None = Field(default=None, max_length=500)
    description: str | None = None
    end_date: datetime | None = None
    resolution_source: str | None = Field(default=None, max_length=500)


class MarketResolve(BaseModel):
    """Schema for resolving a market."""

    outcome: bool
    resolution_source: str | None = Field(default=None, max_length=500)


# ============================================================
# Transaction Schemas
# ============================================================


class TransactionResponse(BaseModel):
    """Schema for transaction data in admin responses."""

    id: int
    user_id: int
    username: str
    amount: float
    type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    """Schema for listing transactions."""

    transactions: list[TransactionResponse]
    total: int


# ============================================================
# Position Schemas
# ============================================================


class PositionResponse(BaseModel):
    """Schema for position data in admin responses."""

    id: int
    user_id: int
    username: str
    market_id: int
    market_question: str
    shares_yes: float
    shares_no: float

    model_config = {"from_attributes": True}


class PositionListResponse(BaseModel):
    """Schema for listing positions."""

    positions: list[PositionResponse]
    total: int


# ============================================================
# Admin Stats Schema
# ============================================================


class AdminStats(BaseModel):
    """Schema for admin dashboard statistics."""

    total_users: int
    total_markets: int
    active_markets: int
    resolved_markets: int
    total_transactions: int
    total_volume: float
    total_positions: int
    recent_transactions: list[TransactionResponse]
