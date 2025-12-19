from datetime import datetime
from enum import Enum

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.base import Base


class TransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    WIN = "win"
    BONUS = "bonus"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[float] = mapped_column()
    type: Mapped[TransactionType] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationship
    user = relationship("User", backref="transactions")
