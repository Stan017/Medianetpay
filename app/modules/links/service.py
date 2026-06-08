"""
Servicio de Links de Cobro y QR dinamicos.

Un PaymentLink genera:
  - URL publica: {API_BASE_URL}/pay/{token}
  - QR PNG: codigo QR de esa URL, guardado en static/qr/{token}.png
"""

import io
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import qrcode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.payment_link import PaymentLink
from app.utils.logger import get_logger

logger = get_logger(__name__)

QR_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "qr")


def _generate_token() -> str:
    return secrets.token_urlsafe(16)


def _checkout_url(token: str) -> str:
    return f"{settings.api_base_url}/pay/{token}"


def _generate_qr_png(url: str, token: str) -> str:
    """Genera el QR PNG y lo guarda en static/qr/. Retorna la URL publica."""
    os.makedirs(QR_DIR, exist_ok=True)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    path = os.path.join(QR_DIR, f"{token}.png")
    img.save(path)

    return f"{settings.api_base_url}/static/qr/{token}.png"


async def create_payment_link(
    db: AsyncSession,
    *,
    merchant_id: str,
    amount: Decimal | None,
    currency: str,
    description: str,
    expires_in_hours: int | None,
    max_uses: int | None,
    expires_at_override: datetime | None = None,
) -> PaymentLink:
    token = _generate_token()
    checkout_url = _checkout_url(token)
    # expires_at_override tiene prioridad (viene con UTC correcto desde el endpoint)
    if expires_at_override is not None:
        expires_at = expires_at_override
    elif expires_in_hours is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
    else:
        expires_at = None

    qr_url = _generate_qr_png(checkout_url, token)
    logger.info("links: QR generado", token=token)

    link = PaymentLink(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        token=token,
        amount=amount,
        currency=currency,
        description=description,
        expires_at=expires_at,
        max_uses=max_uses,
        uses_count=0,
        status="active",
        qr_png_url=qr_url,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    logger.info("links: link creado", id=link.id, merchant=merchant_id)
    return link


async def list_links_by_merchant(
    db: AsyncSession,
    merchant_id: str,
    limit: int = 20,
) -> list[PaymentLink]:
    result = await db.execute(
        select(PaymentLink)
        .where(PaymentLink.merchant_id == merchant_id)
        .order_by(PaymentLink.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_link_by_id(db: AsyncSession, link_id: str, merchant_id: str) -> PaymentLink | None:
    result = await db.execute(
        select(PaymentLink).where(
            PaymentLink.id == link_id,
            PaymentLink.merchant_id == merchant_id,
        )
    )
    return result.scalar_one_or_none()


async def get_link_by_token(db: AsyncSession, token: str) -> PaymentLink | None:
    result = await db.execute(
        select(PaymentLink).where(PaymentLink.token == token)
    )
    return result.scalar_one_or_none()


def enrich_link(link: PaymentLink) -> dict:
    """Agrega campos calculados que no estan en el modelo."""
    from datetime import datetime, timezone as _tz
    data = {c.name: getattr(link, c.name) for c in link.__table__.columns}
    data["checkout_url"] = _checkout_url(link.token)

    # Compute effective status: if expires_at is in the past, mark as expired
    if data.get("status") == "active" and data.get("expires_at"):
        exp = data["expires_at"]
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=_tz.utc)
        if exp < datetime.now(_tz.utc):
            data["status"] = "expired"

    return data
