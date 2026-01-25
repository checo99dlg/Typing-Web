"""initial auth and results tables

Revision ID: 9f3c2f6c2d6a
Revises: 
Create Date: 2026-01-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "9f3c2f6c2d6a"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=40), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("google_sub"),
    )
    op.create_table(
        "test_result",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("wpm", sa.Integer(), nullable=False),
        sa.Column("raw_wpm", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accuracy", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("correct_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("incorrect_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("extra_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("missed_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
    )


def downgrade():
    op.drop_table("test_result")
    op.drop_table("user")
