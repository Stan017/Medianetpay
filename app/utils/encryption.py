"""
Fernet symmetric encryption for sensitive fields stored in the DB.

Usage:
    from app.utils.encryption import encrypt, decrypt

    stored = encrypt("mi-secreto")   # → "gAAAAA..." (save to DB)
    plain  = decrypt(stored)         # → "mi-secreto"

ENCRYPTION_KEY must be a URL-safe base64-encoded 32-byte key.
Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.encryption_key
        if not key:
            raise RuntimeError("ENCRYPTION_KEY no está configurada")
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext string. Returns Fernet token as string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    """
    Decrypt a Fernet token. Falls back to returning the value as-is
    if it can't be decrypted (handles legacy plaintext values).
    """
    if not token:
        return token
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        logger.warning("encryption: decrypt fallido, usando valor crudo (legacy?)")
        return token
