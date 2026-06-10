"""
Endpoints de autenticacion del portal de comercios.

POST /v1/auth/register  - crea comercio + devuelve JWT + API keys
POST /v1/auth/login     - autentica + devuelve JWT
POST /v1/auth/logout    - borra cookie
GET  /v1/auth/me        - perfil del comercio autenticado
PUT  /v1/auth/webhook   - actualizar webhook URL + secret
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.auth.service import login, register
from app.utils.encryption import encrypt
from app.utils.logger import get_logger

logger = get_logger(__name__)
from app.schemas.auth import (
    LoginRequest,
    MerchantProfile,
    RegisterRequest,
    TokenResponse,
    WebhookUpdateRequest,
)
from pydantic import BaseModel, EmailStr
from sqlalchemy import select as _select


class ProfileUpdateRequest(BaseModel):
    business_name: str
    email: EmailStr

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class GoogleLoginRequest(BaseModel):
    id_token: str

router = APIRouter(prefix="/v1/auth", tags=["Auth - Portal"])

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = 60 * 60 * 24  # 24 horas


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_merchant(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Crea una cuenta de comercio nueva.
    El sk_test se muestra UNA sola vez en esta respuesta.
    """
    try:
        merchant, sk_raw, token = await register(
            db,
            business_name=body.business_name,
            ruc=body.ruc,
            email=body.email,
            password=body.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "conflict", "message": str(exc)},
        )

    _set_auth_cookie(response, token)
    return TokenResponse(
        access_token=token,
        merchant_id=merchant.id,
        business_name=merchant.business_name,
        sk_test=sk_raw,
        pk_test=merchant.api_key_public,
    )


@router.post("/login", response_model=TokenResponse)
async def login_merchant(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        merchant, token = await login(db, email=body.email, password=body.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": str(exc)},
        )

    _set_auth_cookie(response, token)
    return TokenResponse(
        access_token=token,
        merchant_id=merchant.id,
        business_name=merchant.business_name,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME)


@router.get("/me", response_model=MerchantProfile)
async def get_profile(
    merchant: Merchant = Depends(require_portal_auth),
) -> Merchant:
    return merchant


@router.put("/profile", response_model=MerchantProfile)
async def update_profile(
    body: ProfileUpdateRequest,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Actualiza nombre del comercio y email."""
    from sqlalchemy import select
    existing = await db.scalar(
        select(Merchant).where(Merchant.email == body.email, Merchant.id != merchant.id)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "Ese email ya esta en uso por otro comercio"},
        )
    merchant.business_name = body.business_name
    merchant.email = body.email
    await db.commit()
    await db.refresh(merchant)
    return merchant


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: PasswordChangeRequest,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Cambia la contrasena. Requiere la contrasena actual para confirmar identidad."""
    import bcrypt
    if not bcrypt.checkpw(body.current_password.encode(), merchant.password_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "wrong_password", "message": "La contrasena actual es incorrecta"},
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "password_too_short", "message": "La nueva contrasena debe tener al menos 8 caracteres"},
        )
    merchant.password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    await db.commit()


# TODO(producción): descomentar cuando se configure GOOGLE_CLIENT_ID en el entorno.
# Comentado porque google-auth rompe el testing en Expo Go.
#
# @router.post("/google", response_model=TokenResponse)
# async def google_login(
#     body: GoogleLoginRequest,
#     response: Response,
#     db: AsyncSession = Depends(get_db),
# ) -> TokenResponse:
#     """
#     Login desde la app móvil usando Google Sign-In.
#     Verifica el ID token de Google, busca al comercio por email y emite JWT.
#     Solo para comercios YA registrados en el portal web.
#     """
#     if not settings.google_client_id:
#         raise HTTPException(
#             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
#             detail={"code": "google_not_configured", "message": "Google login no está configurado en este servidor"},
#         )
#
#     try:
#         from google.oauth2 import id_token as google_id_token
#         from google.auth.transport import requests as google_requests
#         idinfo = google_id_token.verify_oauth2_token(
#             body.id_token,
#             google_requests.Request(),
#             settings.google_client_id,
#         )
#     except Exception:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail={"code": "invalid_google_token", "message": "Token de Google inválido o expirado"},
#         )
#
#     email = idinfo.get("email")
#     if not email or not idinfo.get("email_verified"):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail={"code": "unverified_email", "message": "El email de Google no está verificado"},
#         )
#
#     merchant = await db.scalar(_select(Merchant).where(Merchant.email == email))
#     if not merchant:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail={
#                 "code": "not_registered",
#                 "message": "No existe una cuenta con ese email. Regístrate primero en el portal web en medianetpay.ec",
#             },
#         )
#
#     if merchant.status != "active":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail={"code": "inactive", "message": "Cuenta inactiva — contacta a soporte"},
#         )
#
#     from app.modules.auth.service import _make_jwt
#     token = _make_jwt(merchant.id, merchant.email)
#     _set_auth_cookie(response, token)
#
#     logger.info("auth: google login exitoso", id=merchant.id, email=email)
#     return TokenResponse(
#         access_token=token,
#         merchant_id=merchant.id,
#         business_name=merchant.business_name,
#     )


@router.put("/webhook", response_model=MerchantProfile)
async def update_webhook(
    body: WebhookUpdateRequest,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    merchant.webhook_url = body.webhook_url
    merchant.webhook_secret = encrypt(body.webhook_secret)
    await db.commit()
    await db.refresh(merchant)
    return merchant
