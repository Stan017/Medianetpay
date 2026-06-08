"""Add vitrina: catalog_services table + slug/bio/profile_image/vitrina_active to merchants

Revision ID: 006
Revises: 005
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Columnas nuevas en merchants ─────────────────────────────────────────────
    op.execute("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS slug VARCHAR(100)")
    op.execute("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bio VARCHAR(120)")
    op.execute("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)")
    op.execute(
        "ALTER TABLE merchants ADD COLUMN IF NOT EXISTS vitrina_active BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_merchants_slug ON merchants (slug) WHERE slug IS NOT NULL"
    )

    # ── Tabla catalog_services ───────────────────────────────────────────────────
    op.create_table(
        "catalog_services",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("payment_link_token", sa.String(200), nullable=True),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_catalog_services_merchant_id", "catalog_services", ["merchant_id"])


def downgrade() -> None:
    op.drop_index("ix_catalog_services_merchant_id", table_name="catalog_services")
    op.drop_table("catalog_services")
    op.drop_index("ix_merchants_slug", table_name="merchants")
    op.drop_column("merchants", "slug")
    op.drop_column("merchants", "bio")
    op.drop_column("merchants", "profile_image_url")
    op.drop_column("merchants", "vitrina_active")
