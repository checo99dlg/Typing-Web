"""add password reset tokens

Revision ID: 2c8b5f92d8a1
Revises: 5d1f1f4f2c0a
Create Date: 2026-01-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "2c8b5f92d8a1"
down_revision = "5d1f1f4f2c0a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "password_reset_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.UniqueConstraint("token_hash"),
    )


def downgrade():
    op.drop_table("password_reset_token")
