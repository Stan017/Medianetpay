"""Initial schema: merchants, payment_links, transactions, transaction_logs

Revision ID: 001
Revises:
Create Date: 2026-05-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "merchants",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_name", sa.String(), nullable=False),
        sa.Column("ruc", sa.String(), nullable=False, unique=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("api_key_public", sa.String(), nullable=False, unique=True),
        sa.Column("api_key_secret_hash", sa.String(), nullable=False),
        sa.Column("webhook_url", sa.String(), nullable=True),
        sa.Column("webhook_secret", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("test_mode", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "payment_links",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("token", sa.String(), nullable=False, unique=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("uses_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("qr_png_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("installments", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("idempotency_key", sa.String(), nullable=False, unique=True),
        sa.Column("medianet_ref", sa.String(), nullable=True),
        sa.Column("payment_link_id", sa.String(), sa.ForeignKey("payment_links.id"), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("customer_email", sa.String(), nullable=True),
        sa.Column("customer_name", sa.String(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_transactions_merchant_id", "transactions", ["merchant_id"])
    op.create_index("ix_transactions_status", "transactions", ["status"])
    op.create_index("ix_transactions_medianet_ref", "transactions", ["medianet_ref"])

    op.create_table(
        "transaction_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("transaction_id", sa.String(), sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("medianet_raw", JSONB(), nullable=True),
        sa.Column("triggered_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_transaction_logs_transaction_id", "transaction_logs", ["transaction_id"])


def downgrade() -> None:
    op.drop_table("transaction_logs")
    op.drop_table("transactions")
    op.drop_table("payment_links")
    op.drop_table("merchants")
