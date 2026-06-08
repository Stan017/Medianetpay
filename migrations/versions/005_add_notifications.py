"""add notifications table and push_token to merchants

Revision ID: 005
Revises: 004
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("metadata", postgresql.JSONB(), nullable=True, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_merchant_id", "notifications", ["merchant_id"])
    op.add_column("merchants", sa.Column("push_token", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_index("ix_notifications_merchant_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_column("merchants", "push_token")
