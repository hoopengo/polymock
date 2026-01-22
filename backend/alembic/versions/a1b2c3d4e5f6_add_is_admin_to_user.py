"""add_is_admin_to_user

Revision ID: a1b2c3d4e5f6
Revises: 0ef98cea7a30
Create Date: 2025-12-19 11:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "0ef98cea7a30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_admin column to users table."""
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    """Remove is_admin column from users table."""
    op.drop_column("users", "is_admin")
