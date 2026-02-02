"""add test result flags

Revision ID: 8f2b3c9a1f0e
Revises: 5d1f1f4f2c0a
Create Date: 2026-02-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "8f2b3c9a1f0e"
down_revision = "5d1f1f4f2c0a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("test_result", sa.Column("language", sa.String(length=8), nullable=True))
    op.add_column("test_result", sa.Column("caps_enabled", sa.Boolean(), nullable=True))
    op.add_column("test_result", sa.Column("accents_enabled", sa.Boolean(), nullable=True))
    op.add_column("test_result", sa.Column("punctuation_enabled", sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column("test_result", "punctuation_enabled")
    op.drop_column("test_result", "accents_enabled")
    op.drop_column("test_result", "caps_enabled")
    op.drop_column("test_result", "language")
