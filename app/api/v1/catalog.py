"""
Endpoints protegidos (JWT) para gestión de la Vitrina del comercio.

POST   /v1/catalog/activate              — activar / desactivar vitrina
PUT    /v1/catalog/profile               — actualizar bio + foto del negocio
GET    /v1/catalog/services              — listar servicios
POST   /v1/catalog/services              — crear servicio (+ imagen opcional)
PUT    /v1/catalog/services/{id}         — editar servicio
DELETE /v1/catalog/services/{id}         — eliminar servicio (soft delete)
"""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.catalog import service as catalog_service
from app.schemas.catalog import ServiceOut, VitrinaOut, VitrinaActivate

router = APIRouter(prefix="/v1/catalog", tags=["Vitrina — Catálogo"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB — el backend comprime a 500 KB


def _validate_image(file: UploadFile | None) -> None:
    if file and file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_image", "message": "El archivo debe ser una imagen."},
        )


# ── Vitrina (perfil) ──────────────────────────────────────────────────────────

@router.get("", response_model=VitrinaOut)
async def get_vitrina(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> VitrinaOut:
    data = await catalog_service.get_vitrina(db, merchant.id)
    return VitrinaOut(
        slug=data["slug"],
        bio=data["bio"],
        profile_image_url=data["profile_image_url"],
        vitrina_active=data["vitrina_active"],
        vitrina_url=data["vitrina_url"],
        services=[ServiceOut.model_validate(s) for s in data["services"]],
    )


@router.post("/activate", status_code=status.HTTP_200_OK)
async def activate_vitrina(
    body: VitrinaActivate,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    updated = await catalog_service.set_vitrina_active(db, merchant_id=merchant.id, active=body.active)
    return {
        "vitrina_active": updated.vitrina_active,
        "slug": updated.slug,
        "vitrina_url": f"{settings.portal_base_url}/v/{updated.slug}" if updated.slug else None,
    }


@router.put("/profile", status_code=status.HTTP_200_OK)
async def update_profile(
    bio: Annotated[str | None, Form()] = None,
    profile_image: Annotated[UploadFile | None, File()] = None,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _validate_image(profile_image)
    image_bytes = await profile_image.read() if profile_image else None
    if image_bytes and len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "image_too_large", "message": "Imagen máximo 10 MB."},
        )
    updated = await catalog_service.update_profile(
        db, merchant_id=merchant.id, bio=bio, image_bytes=image_bytes
    )
    return {"bio": updated.bio, "profile_image_url": updated.profile_image_url}


# ── Servicios ─────────────────────────────────────────────────────────────────

@router.get("/services", response_model=list[ServiceOut])
async def list_services(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> list[ServiceOut]:
    services = await catalog_service.list_services(db, merchant.id)
    return [ServiceOut.model_validate(s) for s in services]


@router.post("/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    name: Annotated[str, Form(max_length=100)],
    price: Annotated[Decimal, Form(gt=0)],
    description: Annotated[str | None, Form(max_length=300)] = None,
    position: Annotated[int | None, Form(ge=1, le=10)] = None,
    image: Annotated[UploadFile | None, File()] = None,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> ServiceOut:
    _validate_image(image)
    image_bytes = await image.read() if image else None
    if image_bytes and len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "image_too_large", "message": "Imagen máximo 10 MB."},
        )
    service = await catalog_service.create_service(
        db,
        merchant_id=merchant.id,
        name=name,
        description=description,
        price=price,
        image_bytes=image_bytes,
        position=position,
    )
    return ServiceOut.model_validate(service)


@router.put("/services/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: str,
    name: Annotated[str | None, Form(max_length=100)] = None,
    price: Annotated[Decimal | None, Form(gt=0)] = None,
    description: Annotated[str | None, Form(max_length=300)] = None,
    active: Annotated[bool | None, Form()] = None,
    position: Annotated[int | None, Form(ge=1, le=10)] = None,
    image: Annotated[UploadFile | None, File()] = None,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> ServiceOut:
    _validate_image(image)
    image_bytes = await image.read() if image else None
    service = await catalog_service.update_service(
        db,
        service_id=service_id,
        merchant_id=merchant.id,
        name=name,
        description=description,
        price=price,
        image_bytes=image_bytes,
        active=active,
        position=position,
    )
    return ServiceOut.model_validate(service)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    await catalog_service.delete_service(db, service_id=service_id, merchant_id=merchant.id)
