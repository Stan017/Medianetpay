"""Add refunds table

Revision ID: 002
Revises: 001
Create Date: 2026-05-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refunds",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("transaction_id", sa.String(), sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("medianet_ref", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_refunds_transaction_id", "refunds", ["transaction_id"])
    op.create_index("ix_refunds_merchant_id", "refunds", ["merchant_id"])


def downgrade() -> None:
    op.drop_table("refunds")
