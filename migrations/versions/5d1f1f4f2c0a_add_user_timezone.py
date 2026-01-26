"""add user timezone

Revision ID: 5d1f1f4f2c0a
Revises: 9f3c2f6c2d6a
Create Date: 2026-01-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "5d1f1f4f2c0a"
down_revision = "9f3c2f6c2d6a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade():
    op.drop_column("user", "timezone")
