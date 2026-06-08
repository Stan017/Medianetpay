"""
Lógica de autenticación del portal de comercios.
Registro, login y generación de JWT.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.merchant import Merchant
from app.utils.logger import get_logger

logger = get_logger(__name__)

_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_HOURS = 24


def _make_jwt(merchant_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": merchant_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=_JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[_JWT_ALGORITHM])


async def register(
    db: AsyncSession,
    *,
    business_name: str,
    ruc: str,
    email: str,
    password: str,
) -> tuple[Merchant, str, str]:
    """
    Crea un comercio nuevo.
    Retorna (merchant, sk_raw, access_token).
    sk_raw se muestra UNA vez y no se puede recuperar.
    """
    existing = await db.scalar(
        select(Merchant).where(
            (Merchant.email == email) | (Merchant.ruc == ruc)
        )
    )
    if existing:
        if existing.email == email:
            raise ValueError("Ya existe una cuenta con ese email")
        raise ValueError("Ya existe una cuenta con ese RUC")

    pk = f"pk_test_{secrets.token_urlsafe(16)}"
    sk_raw = f"sk_test_{secrets.token_urlsafe(24)}"
    sk_hash = bcrypt.hashpw(sk_raw.encode(), bcrypt.gensalt()).decode()
    # Primeros 20 chars del sk_ como índice de búsqueda (único por merchant,
    # imposible de adivinar con solo 12 chars visibles, suficiente para O(1) lookup).
    sk_prefix = sk_raw[:20]
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    webhook_secret = secrets.token_urlsafe(32)

    merchant = Merchant(
        id=str(uuid.uuid4()),
        business_name=business_name,
        ruc=ruc,
        email=email,
        password_hash=pw_hash,
        api_key_public=pk,
        api_key_secret_hash=sk_hash,
        api_key_secret_prefix=sk_prefix,
        webhook_secret=webhook_secret,
        status="active",
        test_mode=True,
    )
    db.add(merchant)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError("Ya existe una cuenta con ese email o RUC")
    await db.refresh(merchant)

    token = _make_jwt(merchant.id, merchant.email)
    logger.info("auth: nuevo comercio registrado", id=merchant.id, ruc=ruc)
    return merchant, sk_raw, token


async def login(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> tuple[Merchant, str]:
    """Autentica con email + contraseña. Retorna (merchant, access_token)."""
    merchant = await db.scalar(select(Merchant).where(Merchant.email == email))
    if not merchant:
        raise ValueError("Credenciales inválidas")

    if not bcrypt.checkpw(password.encode(), merchant.password_hash.encode()):
        raise ValueError("Credenciales inválidas")

    if merchant.status != "active":
        raise ValueError("Cuenta inactiva — contacta a soporte")

    token = _make_jwt(merchant.id, merchant.email)
    logger.info("auth: login exitoso", id=merchant.id)
    return merchant, token
