from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.base import Base


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"))

    shares_yes: Mapped[float] = mapped_column(default=0.0)
    shares_no: Mapped[float] = mapped_column(default=0.0)

    # Relationships
    user = relationship("User", backref="positions")
    market = relationship("Market", backref="positions")
