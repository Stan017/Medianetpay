"""008_encrypt_webhook_secret

NULL existing plaintext webhook_secret values.
New values are encrypted with Fernet via app/utils/encryption.py.

Revision ID: 008
Revises: 007
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Beta only — no real merchant data yet.
    # Merchants will re-enter their webhook secret after this migration.
    # New secrets saved via PUT /v1/auth/webhook are Fernet-encrypted.
    op.execute("UPDATE merchants SET webhook_secret = NULL WHERE webhook_secret IS NOT NULL")


def downgrade() -> None:
    # Cannot un-encrypt — values were plaintext before, now they're gone.
    # Downgrade is a no-op; merchants re-configure their secrets if needed.
    pass
