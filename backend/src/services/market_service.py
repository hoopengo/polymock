from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.market import Market
from src.models.position import Position
from src.models.transaction import Transaction, TransactionType
from src.models.user import User


class InsufficientBalanceError(Exception):
    """Raised when user doesn't have enough balance."""

    pass


class MarketNotFoundError(Exception):
    """Raised when market is not found."""

    pass


class MarketResolvedError(Exception):
    """Raised when trying to trade on a resolved market."""

    pass


class UserNotFoundError(Exception):
    """Raised when user is not found."""

    pass


class MarketService:
    """Service for market operations including CPMM trading logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_market(
        self,
        question: str,
        description: str,
        end_date: datetime,
        initial_pool: float = 100.0,
    ) -> Market:
        """
        Create a new prediction market with initial liquidity.

        Args:
            question: The market question
            description: Detailed description
            end_date: When the market closes
            initial_pool: Initial liquidity for both pools (default 100.0)

        Returns:
            The created Market object
        """
        if initial_pool <= 0:
            raise ValueError("Initial pool must be greater than 0")

        # Normalize timezone-aware datetime to naive UTC for PostgreSQL
        if end_date.tzinfo is not None:
            end_date = end_date.astimezone(timezone.utc).replace(tzinfo=None)

        market = Market(
            question=question,
            description=description,
            end_date=end_date,
            pool_yes=initial_pool,
            pool_no=initial_pool,
        )
        self.db.add(market)
        await self.db.commit()
        await self.db.refresh(market)
        return market

    async def get_market(self, market_id: int) -> Market | None:
        """Get a market by ID."""
        result = await self.db.execute(select(Market).where(Market.id == market_id))
        return result.scalar_one_or_none()

    async def get_active_markets(self) -> list[Market]:
        """Get all active (unresolved) markets."""
        result = await self.db.execute(
            select(Market).where(Market.is_resolved == False).order_by(Market.id.desc())  # noqa: E712
        )
        return list(result.scalars().all())

    def calculate_probabilities(self, market: Market) -> tuple[float, float]:
        """
        Calculate current market probabilities.

        Formula:
            Prob_YES = Pool_NO / (Pool_YES + Pool_NO)
            Prob_NO = Pool_YES / (Pool_YES + Pool_NO)

        Returns:
            Tuple of (prob_yes, prob_no)
        """
        total_pool = market.pool_yes + market.pool_no
        if total_pool == 0:
            return 0.5, 0.5

        prob_yes = market.pool_no / total_pool
        prob_no = market.pool_yes / total_pool
        return prob_yes, prob_no

    async def buy_shares(
        self,
        user_id: int,
        market_id: int,
        outcome: bool,
        amount: float,
    ) -> dict:
        """
        Execute a buy trade using simplified parimutuel/CPMM formula.

        Formula:
            Effective_Price = Pool_Counter / (Pool_Target + Pool_Counter + Amount)
            Shares = Amount / Effective_Price

        Args:
            user_id: ID of the user buying shares
            market_id: ID of the market
            outcome: True for YES shares, False for NO shares
            amount: Amount to spend

        Returns:
            Dict with trade details including shares_received and new probabilities

        Raises:
            UserNotFoundError: If user doesn't exist
            MarketNotFoundError: If market doesn't exist
            MarketResolvedError: If market is already resolved
            InsufficientBalanceError: If user balance is too low
        """
        # Get user with lock
        user_result = await self.db.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundError(f"User with id {user_id} not found")

        # Get market with lock
        market_result = await self.db.execute(
            select(Market).where(Market.id == market_id).with_for_update()
        )
        market = market_result.scalar_one_or_none()
        if not market:
            raise MarketNotFoundError(f"Market with id {market_id} not found")

        # Validate market is not resolved
        if market.is_resolved:
            raise MarketResolvedError(f"Market {market_id} is already resolved")

        # Validate user balance
        if user.balance < amount:
            raise InsufficientBalanceError(
                f"Insufficient balance: {user.balance} < {amount}"
            )

        # Calculate effective price and shares
        # For buying YES: Pool_Counter = Pool_NO, Pool_Target = Pool_YES
        # For buying NO: Pool_Counter = Pool_YES, Pool_Target = Pool_NO
        if outcome:  # Buying YES
            pool_target = market.pool_yes
            pool_counter = market.pool_no
        else:  # Buying NO
            pool_target = market.pool_no
            pool_counter = market.pool_yes

        effective_price = pool_counter / (pool_target + pool_counter + amount)
        shares_received = amount / effective_price

        # Update market pools
        if outcome:
            market.pool_yes += amount
        else:
            market.pool_no += amount

        # Update user balance
        user.balance -= amount

        # Get or create position
        position_result = await self.db.execute(
            select(Position).where(
                Position.user_id == user_id, Position.market_id == market_id
            )
        )
        position = position_result.scalar_one_or_none()

        if not position:
            position = Position(
                user_id=user_id,
                market_id=market_id,
                shares_yes=0.0,
                shares_no=0.0,
            )
            self.db.add(position)

        # Update position shares
        if outcome:
            position.shares_yes += shares_received
        else:
            position.shares_no += shares_received

        # Create transaction record
        transaction = Transaction(
            user_id=user_id,
            amount=-amount,  # Negative because user is spending
            type=TransactionType.BUY,
        )
        self.db.add(transaction)

        # Commit all changes
        await self.db.commit()

        # Calculate new probabilities
        new_prob_yes, new_prob_no = self.calculate_probabilities(market)

        return {
            "market_id": market_id,
            "user_id": user_id,
            "outcome": outcome,
            "amount_spent": amount,
            "shares_received": shares_received,
            "effective_price": effective_price,
            "new_prob_yes": new_prob_yes,
            "new_prob_no": new_prob_no,
        }

    async def get_user_position(self, user_id: int, market_id: int) -> Position | None:
        """Get a user's position in a specific market."""
        result = await self.db.execute(
            select(Position).where(
                Position.user_id == user_id, Position.market_id == market_id
            )
        )
        return result.scalar_one_or_none()

    async def resolve_market(
        self,
        market_id: int,
        outcome: bool,
        resolution_source: str | None = None,
    ) -> Market:
        """
        Resolve a market and payout winners.

        Args:
            market_id: ID of the market to resolve
            outcome: The winning outcome (True for YES, False for NO)
            resolution_source: Optional source of the resolution

        Returns:
            The resolved Market object

        Raises:
            MarketNotFoundError: If market doesn't exist
            MarketResolvedError: If market is already resolved
        """
        # Get market with lock
        result = await self.db.execute(
            select(Market).where(Market.id == market_id).with_for_update()
        )
        market = result.scalar_one_or_none()

        if not market:
            raise MarketNotFoundError(f"Market with id {market_id} not found")

        if market.is_resolved:
            raise MarketResolvedError(f"Market {market_id} is already resolved")

        # Update market status
        market.is_resolved = True
        market.outcome = outcome
        if resolution_source:
            market.resolution_source = resolution_source

        # Find winning positions and users
        stmt = select(Position, User).join(User).where(Position.market_id == market_id)

        if outcome:
            stmt = stmt.where(Position.shares_yes > 0)
        else:
            stmt = stmt.where(Position.shares_no > 0)

        result = await self.db.execute(stmt)
        rows = result.all()

        for position, user in rows:
            winning_shares = position.shares_yes if outcome else position.shares_no
            # Payout is 1:1 for winning shares
            payout_amount = winning_shares

            if payout_amount > 0:
                user.balance += payout_amount

                # Create transaction
                tx = Transaction(
                    user_id=user.id,
                    amount=payout_amount,
                    type=TransactionType.WIN,
                )
                self.db.add(tx)

        await self.db.commit()
        await self.db.refresh(market)
        return market
