"""
Módulo Vitrina — gestión del catálogo público de servicios del comercio.

Responsabilidades:
  - CRUD de catalog_services (máx 10 activos por comercio)
  - Auto-generación y actualización de PaymentLinks por servicio
  - Activación/desactivación de vitrina + generación de slug único
  - Compresión de imágenes (Pillow) antes de guardar en static/catalog/
  - Endpoint público sin auth para renderizar la página
"""

import io
import os
import uuid
from decimal import Decimal

from PIL import Image
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.catalog_service import CatalogService
from app.models.merchant import Merchant
from app.models.payment_link import PaymentLink
from app.utils.logger import get_logger
from app.utils.slugify import generate_unique_slug

logger = get_logger(__name__)

CATALOG_IMG_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "static", "catalog"
)
MAX_ACTIVE_SERVICES = 10
MAX_IMAGE_KB = 500


# ── Imagen ────────────────────────────────────────────────────────────────────

def _compress_image(image_bytes: bytes) -> bytes:
    """Comprime y redimensiona la imagen a máximo 500 KB en JPEG."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_image", "message": "El archivo no es una imagen válida."},
        )
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")
    max_dim = 1200
    if img.width > max_dim or img.height > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    quality = 85
    output = io.BytesIO()
    while quality >= 20:
        output.seek(0)
        output.truncate()
        img.save(output, format="JPEG", quality=quality, optimize=True)
        if output.tell() <= MAX_IMAGE_KB * 1024:
            break
        quality -= 10
    return output.getvalue()


def _save_image(image_bytes: bytes, file_id: str) -> str:
    """Guarda imagen comprimida en static/catalog/. Retorna URL pública."""
    os.makedirs(CATALOG_IMG_DIR, exist_ok=True)
    compressed = _compress_image(image_bytes)
    path = os.path.join(CATALOG_IMG_DIR, f"{file_id}.jpg")
    with open(path, "wb") as f:
        f.write(compressed)
    return f"{settings.api_base_url}/static/catalog/{file_id}.jpg"


def _delete_image(image_url: str | None) -> None:
    """Borra imagen anterior del disco si existe."""
    if not image_url:
        return
    filename = image_url.split("/")[-1]
    path = os.path.join(CATALOG_IMG_DIR, filename)
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ── PaymentLink helpers ───────────────────────────────────────────────────────

async def _create_payment_link_for_service(
    db: AsyncSession, merchant_id: str, name: str, price: Decimal
) -> str:
    """Crea un PaymentLink permanente para el servicio. Retorna el token."""
    from app.modules.links.service import create_payment_link

    link = await create_payment_link(
        db,
        merchant_id=merchant_id,
        amount=price,
        currency="USD",
        description=name,
        expires_in_hours=None,
        max_uses=None,
    )
    return link.token


# ── CRUD servicios ────────────────────────────────────────────────────────────

async def list_services(db: AsyncSession, merchant_id: str) -> list[CatalogService]:
    rows = await db.scalars(
        select(CatalogService)
        .where(CatalogService.merchant_id == merchant_id)
        .order_by(CatalogService.position.asc(), CatalogService.created_at.asc())
    )
    return list(rows)


async def create_service(
    db: AsyncSession,
    *,
    merchant_id: str,
    name: str,
    description: str | None,
    price: Decimal,
    image_bytes: bytes | None,
    position: int | None,
) -> CatalogService:
    # Validar máximo 10 servicios activos
    active_count = await db.scalar(
        select(func.count()).select_from(CatalogService).where(
            CatalogService.merchant_id == merchant_id,
            CatalogService.active == True,  # noqa: E712
        )
    )
    if (active_count or 0) >= MAX_ACTIVE_SERVICES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "max_services_reached",
                "message": f"Límite de {MAX_ACTIVE_SERVICES} servicios activos alcanzado.",
            },
        )

    # Posición automática si no se especifica
    if position is None:
        max_pos = await db.scalar(
            select(func.max(CatalogService.position)).where(
                CatalogService.merchant_id == merchant_id
            )
        )
        position = (max_pos or 0) + 1

    service_id = str(uuid.uuid4())

    # Imagen
    image_url = None
    if image_bytes:
        image_url = _save_image(image_bytes, service_id)

    # PaymentLink pre-generado
    token = await _create_payment_link_for_service(db, merchant_id, name, price)

    service = CatalogService(
        id=service_id,
        merchant_id=merchant_id,
        name=name,
        description=description,
        price=price,
        image_url=image_url,
        payment_link_token=token,
        position=position,
        active=True,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    logger.info("catalog: servicio creado", id=service.id, merchant=merchant_id)
    return service


async def update_service(
    db: AsyncSession,
    *,
    service_id: str,
    merchant_id: str,
    name: str | None,
    description: str | None,
    price: Decimal | None,
    image_bytes: bytes | None,
    active: bool | None,
    position: int | None,
) -> CatalogService:
    service = await db.get(CatalogService, service_id)
    if not service or service.merchant_id != merchant_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "Servicio no encontrado"})

    # Si cambia nombre o precio → regenerar PaymentLink
    name_changed = name is not None and name != service.name
    price_changed = price is not None and price != service.price

    if name is not None:
        service.name = name
    if description is not None:
        service.description = description
    if price is not None:
        service.price = price
    if active is not None:
        service.active = active
    if position is not None:
        service.position = position

    if image_bytes:
        _delete_image(service.image_url)
        service.image_url = _save_image(image_bytes, service_id)

    if name_changed or price_changed:
        # Archivar el link anterior — evita que alguien pague al precio viejo
        old_token = service.payment_link_token
        if old_token:
            old_link = await db.scalar(
                select(PaymentLink).where(PaymentLink.token == old_token)
            )
            if old_link:
                old_link.status = "archived"

        service.payment_link_token = await _create_payment_link_for_service(
            db, merchant_id, service.name, service.price
        )

    await db.commit()
    await db.refresh(service)
    logger.info("catalog: servicio actualizado", id=service_id)
    return service


async def delete_service(
    db: AsyncSession, *, service_id: str, merchant_id: str
) -> None:
    """Soft delete — marca active=False, conserva el registro."""
    service = await db.get(CatalogService, service_id)
    if not service or service.merchant_id != merchant_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "Servicio no encontrado"})
    service.active = False
    await db.commit()
    logger.info("catalog: servicio desactivado", id=service_id)


# ── Vitrina (perfil público) ──────────────────────────────────────────────────

async def get_vitrina(db: AsyncSession, merchant_id: str) -> dict:
    merchant = await db.get(Merchant, merchant_id)
    services = await list_services(db, merchant_id)
    vitrina_url = (
        f"{settings.portal_base_url}/v/{merchant.slug}" if merchant.slug else None
    )
    return {
        "slug": merchant.slug,
        "bio": merchant.bio,
        "profile_image_url": merchant.profile_image_url,
        "vitrina_active": merchant.vitrina_active,
        "vitrina_url": vitrina_url,
        "services": services,
    }


async def update_profile(
    db: AsyncSession,
    *,
    merchant_id: str,
    bio: str | None,
    image_bytes: bytes | None,
) -> Merchant:
    merchant = await db.get(Merchant, merchant_id)
    if bio is not None:
        merchant.bio = bio
    if image_bytes:
        _delete_image(merchant.profile_image_url)
        merchant.profile_image_url = _save_image(image_bytes, f"profile_{merchant_id}")
    await db.commit()
    await db.refresh(merchant)
    return merchant


async def set_vitrina_active(
    db: AsyncSession, *, merchant_id: str, active: bool
) -> Merchant:
    merchant = await db.get(Merchant, merchant_id)

    # Generar slug la primera vez que activa la vitrina
    if active and not merchant.slug:
        merchant.slug = await generate_unique_slug(db, merchant.business_name)
        logger.info("catalog: slug generado", slug=merchant.slug, merchant=merchant_id)

    merchant.vitrina_active = active
    await db.commit()
    await db.refresh(merchant)
    return merchant


# ── Consulta pública ──────────────────────────────────────────────────────────

async def get_public_vitrina(db: AsyncSession, slug: str) -> dict | None:
    """
    Retorna datos públicos del comercio + servicios activos.
    None si el slug no existe o la vitrina está inactiva.
    """
    merchant = await db.scalar(
        select(Merchant).where(Merchant.slug == slug, Merchant.vitrina_active == True)  # noqa: E712
    )
    if not merchant:
        return None

    services = await db.scalars(
        select(CatalogService)
        .where(
            CatalogService.merchant_id == merchant.id,
            CatalogService.active == True,  # noqa: E712
            CatalogService.payment_link_token.isnot(None),
        )
        .order_by(CatalogService.position.asc())
    )

    return {
        "slug": merchant.slug,
        "business_name": merchant.business_name,
        "bio": merchant.bio,
        "profile_image_url": merchant.profile_image_url,
        "services": list(services),
    }
