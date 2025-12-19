from datetime import datetime

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.db.base import Base


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    end_date: Mapped[datetime] = mapped_column()

    pool_yes: Mapped[float] = mapped_column(default=0.0)
    pool_no: Mapped[float] = mapped_column(default=0.0)

    is_resolved: Mapped[bool] = mapped_column(default=False)
    outcome: Mapped[bool | None] = mapped_column(nullable=True, default=None)
    resolution_source: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
