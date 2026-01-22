from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    balance: Mapped[float] = mapped_column(default=1000.0)
    is_admin: Mapped[bool] = mapped_column(default=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    theme: Mapped[str] = mapped_column(String(20), default="dark")
    email_notifications: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
