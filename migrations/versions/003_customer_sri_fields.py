"""Add customer SRI fields to transactions

Revision ID: 003
Revises: 002
Create Date: 2026-06-03

Agrega columnas limpias para factura electrónica SRI:
- customer_ruc_cedula    (faltaba en 001, estaba solo en el ORM)
- customer_id_type       (ruc | cedula | pasaporte | consumidor_final)
- customer_phone         (estaba enterrado en metadata JSONB)
- customer_address       (dirección del comprador, opcional)
- invoice_status         (NULL | emitted | authorized | cancelled)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS — safe to re-run si alguna columna ya fue creada manualmente en Supabase
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_ruc_cedula VARCHAR")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id_type    VARCHAR")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone      VARCHAR")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_address    VARCHAR")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_status      VARCHAR")

    op.execute("CREATE INDEX IF NOT EXISTS ix_transactions_customer_ruc_cedula ON transactions (customer_ruc_cedula)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transactions_invoice_status      ON transactions (invoice_status)")


def downgrade() -> None:
    op.drop_index("ix_transactions_invoice_status",      table_name="transactions")
    op.drop_index("ix_transactions_customer_ruc_cedula", table_name="transactions")

    op.drop_column("transactions", "invoice_status")
    op.drop_column("transactions", "customer_address")
    op.drop_column("transactions", "customer_phone")
    op.drop_column("transactions", "customer_id_type")
    op.drop_column("transactions", "customer_ruc_cedula")
