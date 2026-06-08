import io

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.auth import require_secret_key
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.links.service import create_payment_link, get_link_by_id, list_links_by_merchant, enrich_link
from app.schemas.links import PaymentLinkCreate, PaymentLinkResponse


async def require_portal_or_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """Acepta autenticacion por JWT de portal (cookie) o por API key (header).
    El portal usa cookie; integraciones externas usan X-API-Key."""
    if access_token:
        return await require_portal_auth(access_token=access_token, db=db)
    if x_api_key:
        return await require_secret_key(x_api_key=x_api_key, db=db)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "not_authenticated", "message": "Se requiere autenticacion"},
    )

router = APIRouter(tags=["links"])


@router.get("/v1/links", response_model=list[PaymentLinkResponse])
async def list_links_endpoint(
    merchant: Merchant = Depends(require_portal_or_api_key),
    db: AsyncSession = Depends(get_db),
) -> list[PaymentLinkResponse]:
    """Lista los ultimos 20 links del comercio, orden descendente por fecha."""
    links = await list_links_by_merchant(db, merchant.id)
    return [PaymentLinkResponse.model_validate(enrich_link(link)) for link in links]


@router.post("/v1/links", response_model=PaymentLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link_endpoint(
    body: PaymentLinkCreate,
    merchant: Merchant = Depends(require_portal_or_api_key),
    db: AsyncSession = Depends(get_db),
) -> PaymentLinkResponse:
    # expires_at tiene prioridad sobre expires_in_hours.
    # Se convierte a UTC correctamente con astimezone (no .replace, que ignora el tz existente).
    from datetime import timezone as _tz, datetime as _dt
    expires_in_hours = body.expires_in_hours
    expires_at_override = None
    if body.expires_at:
        # Normalizar a UTC - si ya tiene tz lo convierte, si es naive lo asume UTC
        ea = body.expires_at
        if ea.tzinfo is None:
            ea = ea.replace(tzinfo=_tz.utc)
        else:
            ea = ea.astimezone(_tz.utc)
        expires_at_override = ea
        if not expires_in_hours:
            diff = ea - _dt.now(_tz.utc)
            expires_in_hours = max(1, round(diff.total_seconds() / 3600))

    link = await create_payment_link(
        db,
        merchant_id=merchant.id,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        expires_in_hours=expires_in_hours,
        expires_at_override=expires_at_override,
        max_uses=body.max_uses,
    )
    data = enrich_link(link)
    return PaymentLinkResponse.model_validate(data)


@router.get("/v1/links/{link_id}", response_model=PaymentLinkResponse)
async def get_link_endpoint(
    link_id: str,
    merchant: Merchant = Depends(require_portal_or_api_key),
    db: AsyncSession = Depends(get_db),
) -> PaymentLinkResponse:
    link = await get_link_by_id(db, link_id, merchant.id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "link_not_found", "message": f"Link {link_id} no encontrado"},
        )
    data = enrich_link(link)
    return PaymentLinkResponse.model_validate(data)


@router.get("/v1/links/{link_id}/qr", include_in_schema=True)
async def get_link_qr(
    link_id: str,
    merchant: Merchant = Depends(require_portal_or_api_key),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Genera y devuelve el QR del link de cobro como imagen PNG.
    El QR apunta directamente a la pagina de checkout hosted.
    """
    import qrcode
    import qrcode.image.pil

    link = await get_link_by_id(db, link_id, merchant.id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "link_not_found", "message": f"Link {link_id} no encontrado"},
        )

    data = enrich_link(link)
    checkout_url = data["checkout_url"]

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(checkout_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.patch("/v1/links/{link_id}/deactivate", response_model=PaymentLinkResponse)
async def deactivate_link_endpoint(
    link_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> PaymentLinkResponse:
    """Desactiva un link de cobro (status -> inactive). Irreversible desde el portal."""
    link = await get_link_by_id(db, link_id, merchant.id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "link_not_found", "message": f"Link {link_id} no encontrado"},
        )
    if link.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_inactive", "message": "El link ya esta inactivo"},
        )
    link.status = "inactive"
    await db.commit()
    await db.refresh(link)
    return PaymentLinkResponse.model_validate(enrich_link(link))


@router.delete("/v1/links/{link_id}", status_code=204)
async def delete_link_endpoint(
    link_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Elimina un link. Bloqueado solo si tiene pagos COMPLETADOS (auditoria)."""
    from sqlalchemy import select, func
    from app.models.transaction import Transaction

    link = await get_link_by_id(db, link_id, merchant.id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "link_not_found", "message": f"Link {link_id} no encontrado"},
        )

    completed = await db.scalar(
        select(func.count()).where(
            Transaction.payment_link_id == link_id,
            Transaction.status == "completed",
        )
    ) or 0

    if completed > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "link_has_completed_payments",
                "message": f"Este link tiene {completed} pago(s) completado(s). Desactivalo en su lugar para conservar el historial.",
            },
        )

    await db.delete(link)
    await db.commit()


# GET /pay/{token} movido a app/api/v1/checkout.py (Fase 4)
