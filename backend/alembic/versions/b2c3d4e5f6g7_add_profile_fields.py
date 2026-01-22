"""Add profile fields to user

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6g7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column(
        "users",
        sa.Column("theme", sa.String(20), nullable=False, server_default="dark"),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_notifications", sa.Boolean(), nullable=False, server_default="true"
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "email_notifications")
    op.drop_column("users", "theme")
    op.drop_column("users", "avatar_url")
