"""Admin API endpoints for user and market management."""

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from src.api.deps import require_admin
from src.db.session import get_db
from src.models.market import Market
from src.models.position import Position
from src.models.transaction import Transaction
from src.models.user import User
from src.schemas.admin import (
    AdminStats,
    MarketResolve,
    MarketUpdate,
    PositionListResponse,
    PositionResponse,
    TransactionListResponse,
    TransactionResponse,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from src.schemas.market import MarketCreate, MarketResponse
from src.services.market_service import MarketService

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================
# User Management
# ============================================================


@router.get("/users", response_model=UserListResponse)
async def list_users(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserListResponse:
    """List all users (admin only)."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=len(users),
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Get a single user by ID (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found",
        )

    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Update a user's balance or admin status (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found",
        )

    # Prevent admin from removing their own admin status
    if user.id == admin.id and user_data.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status",
        )

    # Apply updates
    if user_data.balance is not None:
        user.balance = user_data.balance
    if user_data.is_admin is not None:
        user.is_admin = user_data.is_admin

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


# ============================================================
# Market Management
# ============================================================


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


@router.get("/markets", response_model=list[MarketResponse])
async def list_all_markets(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MarketResponse]:
    """List all markets including resolved ones (admin only)."""
    service = MarketService(db)
    result = await db.execute(select(Market).order_by(Market.id.desc()))
    markets = result.scalars().all()

    return [_market_to_response(m, service) for m in markets]


@router.post(
    "/markets", response_model=MarketResponse, status_code=status.HTTP_201_CREATED
)
async def create_market(
    market_data: MarketCreate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MarketResponse:
    """Create a new market (admin only)."""
    service = MarketService(db)
    market = await service.create_market(
        question=market_data.question,
        description=market_data.description,
        end_date=market_data.end_date,
        initial_pool=market_data.initial_pool,
    )

    return _market_to_response(market, service)


@router.patch("/markets/{market_id}", response_model=MarketResponse)
async def update_market(
    market_id: int,
    market_data: MarketUpdate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MarketResponse:
    """Update a market (admin only)."""
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market with id {market_id} not found",
        )

    if market.is_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a resolved market",
        )

    # Apply updates
    if market_data.question is not None:
        market.question = market_data.question
    if market_data.description is not None:
        market.description = market_data.description
    if market_data.end_date is not None:
        market.end_date = market_data.end_date
    if market_data.resolution_source is not None:
        market.resolution_source = market_data.resolution_source

    await db.commit()
    await db.refresh(market)

    service = MarketService(db)
    return _market_to_response(market, service)


@router.delete("/markets/{market_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_market(
    market_id: int,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a market (admin only)."""
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market with id {market_id} not found",
        )

    await db.delete(market)
    await db.commit()


@router.post("/markets/{market_id}/resolve", response_model=MarketResponse)
async def resolve_market(
    market_id: int,
    resolve_data: MarketResolve,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MarketResponse:
    """Resolve a market with an outcome (admin only)."""
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market with id {market_id} not found",
        )

    if market.is_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Market is already resolved",
        )

    market.is_resolved = True
    market.outcome = resolve_data.outcome
    if resolve_data.resolution_source:
        market.resolution_source = resolve_data.resolution_source

    await db.commit()
    await db.refresh(market)

    service = MarketService(db)
    return _market_to_response(market, service)


# ============================================================
# Transaction Management
# ============================================================


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int | None = Query(default=None, description="Filter by user ID"),
    type: str | None = Query(default=None, description="Filter by transaction type"),
    limit: int = Query(default=50, le=200, description="Maximum results"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
) -> TransactionListResponse:
    """List all transactions with optional filters (admin only)."""
    query = select(Transaction).options(joinedload(Transaction.user))

    if user_id is not None:
        query = query.where(Transaction.user_id == user_id)
    if type is not None:
        query = query.where(Transaction.type == type)

    # Get total count
    count_query = select(func.count(Transaction.id))
    if user_id is not None:
        count_query = count_query.where(Transaction.user_id == user_id)
    if type is not None:
        count_query = count_query.where(Transaction.type == type)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    transactions = result.unique().scalars().all()

    return TransactionListResponse(
        transactions=[
            TransactionResponse(
                id=t.id,
                user_id=t.user_id,
                username=t.user.username,
                amount=t.amount,
                type=t.type.value if hasattr(t.type, "value") else str(t.type),
                created_at=t.created_at,
            )
            for t in transactions
        ],
        total=total,
    )


# ============================================================
# Position Management
# ============================================================


@router.get("/positions", response_model=PositionListResponse)
async def list_positions(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: int | None = Query(default=None, description="Filter by user ID"),
    market_id: int | None = Query(default=None, description="Filter by market ID"),
    limit: int = Query(default=50, le=200, description="Maximum results"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
) -> PositionListResponse:
    """List all positions with optional filters (admin only)."""
    query = select(Position).options(
        joinedload(Position.user),
        joinedload(Position.market),
    )

    if user_id is not None:
        query = query.where(Position.user_id == user_id)
    if market_id is not None:
        query = query.where(Position.market_id == market_id)

    # Only show non-zero positions
    query = query.where((Position.shares_yes > 0) | (Position.shares_no > 0))

    # Get total count
    count_query = select(func.count(Position.id)).where(
        (Position.shares_yes > 0) | (Position.shares_no > 0)
    )
    if user_id is not None:
        count_query = count_query.where(Position.user_id == user_id)
    if market_id is not None:
        count_query = count_query.where(Position.market_id == market_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Position.id.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    positions = result.unique().scalars().all()

    return PositionListResponse(
        positions=[
            PositionResponse(
                id=p.id,
                user_id=p.user_id,
                username=p.user.username,
                market_id=p.market_id,
                market_question=p.market.question,
                shares_yes=p.shares_yes,
                shares_no=p.shares_no,
            )
            for p in positions
        ],
        total=total,
    )


# ============================================================
# Admin Statistics
# ============================================================


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminStats:
    """Get admin dashboard statistics (admin only)."""
    # User count
    user_count_result = await db.execute(select(func.count(User.id)))
    total_users = user_count_result.scalar() or 0

    # Market counts
    market_count_result = await db.execute(select(func.count(Market.id)))
    total_markets = market_count_result.scalar() or 0

    active_market_result = await db.execute(
        select(func.count(Market.id)).where(Market.is_resolved == False)  # noqa: E712
    )
    active_markets = active_market_result.scalar() or 0

    resolved_markets = total_markets - active_markets

    # Transaction stats
    tx_count_result = await db.execute(select(func.count(Transaction.id)))
    total_transactions = tx_count_result.scalar() or 0

    volume_result = await db.execute(select(func.sum(Transaction.amount)))
    total_volume = volume_result.scalar() or 0.0

    # Position count (non-zero positions)
    position_count_result = await db.execute(
        select(func.count(Position.id)).where(
            (Position.shares_yes > 0) | (Position.shares_no > 0)
        )
    )
    total_positions = position_count_result.scalar() or 0

    # Recent transactions
    recent_tx_query = (
        select(Transaction)
        .options(joinedload(Transaction.user))
        .order_by(Transaction.created_at.desc())
        .limit(10)
    )
    recent_tx_result = await db.execute(recent_tx_query)
    recent_transactions = recent_tx_result.unique().scalars().all()

    return AdminStats(
        total_users=total_users,
        total_markets=total_markets,
        active_markets=active_markets,
        resolved_markets=resolved_markets,
        total_transactions=total_transactions,
        total_volume=total_volume,
        total_positions=total_positions,
        recent_transactions=[
            TransactionResponse(
                id=t.id,
                user_id=t.user_id,
                username=t.user.username,
                amount=t.amount,
                type=t.type.value if hasattr(t.type, "value") else str(t.type),
                created_at=t.created_at,
            )
            for t in recent_transactions
        ],
    )


# ============================================================
# Data Export
# ============================================================


@router.get("/export/users")
async def export_users(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """Export all users as CSV (admin only)."""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Username", "Balance", "Is Admin", "Created At"])

    for user in users:
        writer.writerow(
            [
                user.id,
                user.username,
                user.balance,
                user.is_admin,
                user.created_at.isoformat(),
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"},
    )


@router.get("/export/transactions")
async def export_transactions(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """Export all transactions as CSV (admin only)."""
    result = await db.execute(
        select(Transaction)
        .options(joinedload(Transaction.user))
        .order_by(Transaction.created_at.desc())
    )
    transactions = result.unique().scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Username", "Amount", "Type", "Created At"])

    for tx in transactions:
        writer.writerow(
            [
                tx.id,
                tx.user_id,
                tx.user.username,
                tx.amount,
                tx.type.value if hasattr(tx.type, "value") else str(tx.type),
                tx.created_at.isoformat(),
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"},
    )
