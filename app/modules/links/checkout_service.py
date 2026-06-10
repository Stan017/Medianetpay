"""
Servicio de checkout público via Link de Cobro (WebCheckout).

Flujo:
  1. Validar el link (activo, no expirado, usos disponibles)
  2. Crear transacción pending en DB
  3. Llamar a MediaNet WebCheckout -> recibir payment URL
  4. Incrementar uses_count
  5. Devolver (transaction_id, status="pending", redirect_url)

El cliente es redirigido al redirect_url (página de MediaNet).
Cuando el cliente paga, MediaNet llama a url_back con el resultado.
"""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.payment_link import PaymentLink
from app.modules.links.service import get_link_by_token
from app.modules.payments.service import create_webcheckout_charge
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def public_charge(
    db: AsyncSession,
    *,
    token: str,
    amount: Decimal | None,
    customer_email: str | None,
    customer_name: str | None,
    customer_ruc_cedula: str | None,
    idempotency_key: str,
) -> dict:
    """
    Inicia un pago WebCheckout via Link de Cobro.

    Returns dict con:
      transaction_id, status ("pending"), amount, currency, redirect_url
    """
    link: PaymentLink | None = await get_link_by_token(db, token)

    if not link or link.status != "active":
        raise ValueError("Link de cobro no válido o inactivo")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise ValueError("Este link de cobro ha expirado")

    if link.max_uses is not None and link.uses_count >= link.max_uses:
        raise ValueError("Este link ha alcanzado el máximo de usos permitidos")

    charge_amount = link.amount if link.amount is not None else amount
    if charge_amount is None:
        raise ValueError("Este link requiere que ingreses un monto")

    _MIN = Decimal("0.01")
    _MAX = Decimal("50000.00")
    if charge_amount < _MIN:
        raise ValueError("El monto mínimo es $0.01")
    if charge_amount > _MAX:
        raise ValueError("El monto máximo permitido es $50,000.00")

    merchant: Merchant | None = await db.get(Merchant, link.merchant_id)
    if not merchant or merchant.status != "active":
        raise ValueError("Comercio no disponible")

    txn, payment_url = await create_webcheckout_charge(
        db,
        merchant_id=merchant.id,
        amount=charge_amount,
        currency=link.currency,
        description=link.description,
        idempotency_key=idempotency_key,
        payment_link_id=link.id,
        link_token=token,
        customer_email=customer_email,
        customer_name=customer_name,
        customer_ruc_cedula=customer_ruc_cedula,
        metadata={"source": "hosted_checkout", "link_token": token},
    )

    # Incrementar usos del link de forma atómica — evita race conditions si dos
    # requests llegan al mismo tiempo para el mismo link.
    if txn.status == "pending" and not (txn.extra_data or {}).get("uses_counted"):
        stmt = (
            sql_update(PaymentLink)
            .where(PaymentLink.id == link.id)
            .values(uses_count=PaymentLink.uses_count + 1)
        )
        if link.max_uses is not None:
            # Solo incrementar si todavía hay usos disponibles.
            stmt = stmt.where(PaymentLink.uses_count < link.max_uses)

        result = await db.execute(stmt)
        if link.max_uses is not None and result.rowcount == 0:
            # Otro request llegó primero y agotó el límite.
            raise ValueError("Este link ha alcanzado el máximo de usos permitidos")

        txn.extra_data = {**(txn.extra_data or {}), "uses_counted": True}
        await db.commit()

    logger.info("checkout: redirigiendo a MediaNet", txn=txn.id)

    return {
        "transaction_id": txn.id,
        "status": txn.status,
        "amount": str(txn.amount),
        "currency": txn.currency,
        "redirect_url": payment_url,
    }
