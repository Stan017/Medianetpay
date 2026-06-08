"""
Autenticación por API key.

sk_live_xxx / sk_test_xxx  → clave secreta, requerida para escribir (cobros, reembolsos)
pk_live_xxx / pk_test_xxx  → clave pública, solo lectura (consultas, links públicos)

Bug #2 fix: sk_ lookup ahora es O(1) via columna indexada api_key_secret_prefix.
Antes: SELECT * de toda la tabla + bcrypt en cada fila → O(N).
Ahora: WHERE api_key_secret_prefix = :prefix → candidato único → bcrypt una sola vez.
"""

import bcrypt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.merchant import Merchant


async def _resolve_merchant(api_key: str, db: AsyncSession) -> Merchant:
    # ── Clave pública: comparación directa por valor exacto ───────────────────
    if api_key.startswith("pk_"):
        result = await db.execute(
            select(Merchant).where(Merchant.api_key_public == api_key).limit(1)
        )
        merchant = result.scalars().first()
        if merchant:
            return merchant

    # ── Clave secreta: prefix indexado → O(1), luego bcrypt solo al candidato ─
    elif api_key.startswith("sk_"):
        prefix = api_key[:20]  # mismo largo que se almacena en registro
        result = await db.execute(
            select(Merchant).where(Merchant.api_key_secret_prefix == prefix).limit(1)
        )
        candidate = result.scalars().first()
        if candidate:
            try:
                if bcrypt.checkpw(api_key.encode(), candidate.api_key_secret_hash.encode()):
                    return candidate
            except Exception:
                pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "invalid_api_key", "message": "API key inválida"},
    )


async def require_secret_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Solo acepta claves secretas (sk_). Requerida para operaciones de escritura."""
    if not (x_api_key.startswith("sk_live_") or x_api_key.startswith("sk_test_")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "public_key_not_allowed",
                "message": "Esta operación requiere la clave secreta (sk_). "
                           "La clave pública (pk_) es solo para el frontend.",
            },
        )
    merchant = await _resolve_merchant(x_api_key, db)
    if merchant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "merchant_inactive", "message": "Cuenta de comercio inactiva"},
        )
    return merchant


async def require_any_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Acepta clave pública o secreta. Para operaciones de lectura."""
    return await _resolve_merchant(x_api_key, db)
