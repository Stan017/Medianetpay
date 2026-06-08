"""Add api_key_secret_prefix to merchants

Revision ID: 004
Revises: 003
Create Date: 2026-06-04

Agrega la columna api_key_secret_prefix a merchants.
Esta columna existe en el ORM desde el inicio pero nunca fue creada
por ninguna migración — solo existía en las instancias creadas manualmente.
Se usa para mostrar el prefijo de la sk_ sin exponer el hash completo.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS — seguro de re-ejecutar si la columna ya fue creada manualmente
    op.execute("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS api_key_secret_prefix VARCHAR")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_merchants_api_key_secret_prefix "
        "ON merchants (api_key_secret_prefix)"
    )


def downgrade() -> None:
    op.drop_index("ix_merchants_api_key_secret_prefix", table_name="merchants")
    op.drop_column("merchants", "api_key_secret_prefix")
