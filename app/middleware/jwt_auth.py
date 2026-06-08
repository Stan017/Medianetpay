"""
Dependencia FastAPI para rutas protegidas por JWT del portal.
Uso: merchant = Depends(require_portal_auth)

Acepta JWT en dos formas:
  - Cookie httpOnly "access_token"  → portal web Next.js
  - Header "Authorization: Bearer <token>" → app móvil React Native

En Android, el header Cookie seteado manualmente por axios puede ser descartado por
OkHttp. El mobile siempre envía el Bearer token en Authorization, así que esta función
revisa ambos. El portal web usa solo cookie.
"""

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.merchant import Merchant
from app.modules.auth.service import decode_jwt


async def require_portal_auth(
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Valida JWT. Acepta cookie httpOnly (portal web) o Bearer token (app móvil)."""
    # Resolver token: cookie tiene prioridad, Authorization como fallback para mobile
    token = access_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "not_authenticated", "message": "Sesión no iniciada"},
        )
    try:
        payload = decode_jwt(token)
        merchant_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_token", "message": "Token inválido o expirado"},
        )

    merchant = await db.get(Merchant, merchant_id)
    if not merchant or merchant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "merchant_not_found", "message": "Comercio no encontrado"},
        )
    return merchant
