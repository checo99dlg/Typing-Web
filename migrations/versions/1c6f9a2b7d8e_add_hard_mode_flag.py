"""add hard mode flag

Revision ID: 1c6f9a2b7d8e
Revises: 3b4a1d7c9e2f
Create Date: 2026-02-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "1c6f9a2b7d8e"
down_revision = "3b4a1d7c9e2f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("test_result", sa.Column("hard_mode_enabled", sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column("test_result", "hard_mode_enabled")
