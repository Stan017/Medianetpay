"""Fix missing refunds table

Revision ID: 007
Revises: 006
Create Date: 2026-06-07

La tabla refunds fue declarada en migración 002 pero no existe en la BD
(el proyecto Supabase fue recreado y las versiones se re-marcaron sin
reejecutar). Esta migración la crea con IF NOT EXISTS para ser idempotente.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Usar get_bind para verificar si la tabla ya existe antes de crearla
    conn = op.get_bind()
    exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name='refunds')"
    )).scalar()

    if not exists:
        op.create_table(
            "refunds",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column(
                "transaction_id",
                sa.String(),
                sa.ForeignKey("transactions.id"),
                nullable=False,
            ),
            sa.Column(
                "merchant_id",
                sa.String(),
                sa.ForeignKey("merchants.id"),
                nullable=False,
            ),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("reason", sa.String(), nullable=True),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("medianet_ref", sa.String(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
        )
        op.create_index("ix_refunds_transaction_id", "refunds", ["transaction_id"])
        op.create_index("ix_refunds_merchant_id", "refunds", ["merchant_id"])


def downgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name='refunds')"
    )).scalar()
    if exists:
        op.drop_index("ix_refunds_merchant_id", table_name="refunds")
        op.drop_index("ix_refunds_transaction_id", table_name="refunds")
        op.drop_table("refunds")
