from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from src.api.deps import get_current_user
from src.core.security import get_password_hash
from src.main import app
from src.models.market import Market
from src.models.user import User


@pytest_asyncio.fixture
async def normal_user(db_session):
    user = User(
        username="testuser",
        hashed_password=get_password_hash("testpass"),
        balance=1000.0,
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_buy_shares(client: AsyncClient, normal_user, db_session):
    # Create a market
    market = Market(
        question="Will it rain?",
        description="Rain prediction",
        end_date=datetime.now(timezone.utc) + timedelta(days=1),
        pool_yes=100.0,
        pool_no=100.0,
    )
    db_session.add(market)
    await db_session.commit()
    await db_session.refresh(market)

    # Mock auth
    app.dependency_overrides[get_current_user] = lambda: normal_user

    # Buy YES shares
    response = await client.post(
        f"/api/v1/markets/{market.id}/buy", json={"amount": 50.0, "outcome": True}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["amount_spent"] == 50.0
    assert data["outcome"] is True
    # Calculate expected shares:
    # pool_yes=100, pool_no=100.
    # Buy YES: target=100, counter=100.
    # Effective price = 100 / (100 + 100 + 50) = 100 / 250 = 0.4
    # Shares = 50 / 0.4 = 125
    assert abs(data["shares_received"] - 125.0) < 0.001

    # Verify DB state
    await db_session.refresh(normal_user)
    assert normal_user.balance == 950.0

    await db_session.refresh(market)
    assert market.pool_yes == 150.0
    assert market.pool_no == 100.0

    app.dependency_overrides.pop(get_current_user)


@pytest.mark.asyncio
async def test_insufficient_balance(client: AsyncClient, normal_user, db_session):
    # Create a market
    market = Market(
        question="Will it snow?",
        description="Snow prediction",
        end_date=datetime.now(timezone.utc) + timedelta(days=1),
        pool_yes=100.0,
        pool_no=100.0,
    )
    db_session.add(market)
    await db_session.commit()
    await db_session.refresh(market)

    app.dependency_overrides[get_current_user] = lambda: normal_user

    # Try to buy more than balance (1000)
    response = await client.post(
        f"/api/v1/markets/{market.id}/buy", json={"amount": 2000.0, "outcome": True}
    )

    assert response.status_code == 402
    assert "Insufficient balance" in response.json()["detail"]

    app.dependency_overrides.pop(get_current_user)
