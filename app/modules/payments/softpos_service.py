"""
Servicio SoftPOS — cobro con tarjeta presente (card-present).

Diferencia clave vs WebCheckout:
  - WebCheckout: cliente paga en página hosted de MediaNet (redirect)
  - SoftPOS:     tarjeta se "lee" en el datáfono (app móvil), resultado sincrónico

En simulación: el card_token determina aprobado/rechazado.
En producción:  MediaNet proveerá un SDK certificado que reemplaza el card_token
                por el PAN encriptado del chip EMV. La lógica aquí no cambia.
"""

import uuid
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.transaction import Transaction
from app.models.transaction_log import TransactionLog
from app.schemas.softpos import MOCK_CARDS
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def create_softpos_charge(
    db: AsyncSession,
    *,
    merchant_id: str,
    amount: Decimal,
    currency: str,
    description: str,
    idempotency_key: str,
    card_token: str,
    customer_name: str | None,
    customer_id_type: str | None,
    customer_ruc_cedula: str | None,
    customer_email: str | None,
    customer_phone: str | None,
    customer_address: str | None,
    installments: int,
) -> dict:
    """
    Crea un cobro SoftPOS sincrónico.

    1. Idempotencia — retorna resultado anterior si ya existe
    2. Persiste transacción en estado 'pending'
    3. Llama al conector MediaNet POS (sincrónico)
    4. Actualiza estado a 'completed' o 'failed'
    5. Retorna resultado final — sin redirect
    """
    card_info = MOCK_CARDS.get(card_token, MOCK_CARDS["4242"])

    # ── 0. Idempotencia ─────────────────────────────────────────────────────────
    existing = await db.scalar(
        select(Transaction).where(Transaction.idempotency_key == idempotency_key)
    )
    if existing:
        logger.info("softpos: idempotency hit", key=idempotency_key, txn=existing.id)
        extra = existing.extra_data or {}
        return {
            "transaction_id":     existing.id,
            "status":             existing.status,
            "amount":             str(existing.amount),
            "currency":           existing.currency,
            "card_brand":         extra.get("card_brand", card_info["brand"]),
            "card_last4":         extra.get("card_last4", card_info["last4"]),
            "authorization_code": extra.get("authorization"),
            "medianet_ref":       existing.medianet_ref,
            "description":        existing.description,
        }

    # ── 1. Crear transacción pending ────────────────────────────────────────────
    txn = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        amount=amount,
        currency=currency,
        status="pending",
        payment_method="card_present",
        installments=installments,
        idempotency_key=idempotency_key,
        description=description,
        customer_name=customer_name,
        customer_id_type=customer_id_type,
        customer_ruc_cedula=customer_ruc_cedula,
        customer_email=customer_email,
        customer_phone=customer_phone,
        customer_address=customer_address,
        extra_data={
            "source": "softpos",
            "card_last4": card_info["last4"],
            "card_brand": card_info["brand"],
        },
    )
    db.add(txn)
    db.add(TransactionLog(
        id=str(uuid.uuid4()),
        transaction_id=txn.id,
        from_status=None,
        to_status="pending",
        triggered_by="softpos",
        medianet_raw={},
    ))
    try:
        await db.commit()
    except IntegrityError:
        # Race condition: dos requests con la misma idempotency_key llegaron simultáneamente.
        await db.rollback()
        existing = await db.scalar(
            select(Transaction).where(Transaction.idempotency_key == idempotency_key)
        )
        if existing:
            logger.info("softpos: idempotency race resuelto", key=idempotency_key, txn=existing.id)
            extra = existing.extra_data or {}
            return {
                "transaction_id":     existing.id,
                "status":             existing.status,
                "amount":             str(existing.amount),
                "currency":           existing.currency,
                "card_brand":         extra.get("card_brand", card_info["brand"]),
                "card_last4":         extra.get("card_last4", card_info["last4"]),
                "authorization_code": extra.get("authorization"),
                "medianet_ref":       existing.medianet_ref,
                "description":        existing.description,
            }
        raise

    # ── 2. Llamar al conector MediaNet POS ──────────────────────────────────────
    medianet_result: dict = {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.medianet_api_url}/app/webservice/pos/charge",
                json={
                    "key_webservice": settings.medianet_api_key,
                    "username":       settings.medianet_api_username,
                    "reference":      txn.id,
                    "value":          float(amount),
                    "currency":       currency,
                    "description":    description,
                    "card_token":     card_token,
                    "installments":   installments,
                },
            )
            resp.raise_for_status()
            medianet_result = resp.json()
    except Exception as exc:
        logger.error("softpos: error llamando a MediaNet", txn_id=txn.id, error=str(exc))
        medianet_result = {"error": str(exc)}

    # ── 3. Actualizar estado según respuesta ────────────────────────────────────
    approved   = medianet_result.get("status") == "approved"
    new_status = "completed" if approved else "failed"

    txn.status      = new_status
    txn.medianet_ref = medianet_result.get("payment_reference")

    db.add(TransactionLog(
        id=str(uuid.uuid4()),
        transaction_id=txn.id,
        from_status="pending",
        to_status=new_status,
        triggered_by="softpos_medianet_response",
        medianet_raw=medianet_result,
    ))
    await db.commit()

    # Notificación al comercio
    from app.modules.notifications import service as notification_service
    card_brand = medianet_result.get("card_brand", card_info["brand"])
    card_last4 = medianet_result.get("card_last4", card_info["last4"])
    if approved:
        await notification_service.create(
            db,
            merchant_id=merchant_id,
            type="txn.approved",
            title="Pago aprobado ✓",
            body=f"${amount} · {card_brand} ···{card_last4}",
            metadata={"transaction_id": txn.id, "amount": str(amount)},
        )
    else:
        await notification_service.create(
            db,
            merchant_id=merchant_id,
            type="txn.failed",
            title="Pago rechazado",
            body=f"Tarjeta declinada — ${amount}",
            metadata={"transaction_id": txn.id, "amount": str(amount)},
        )
    await db.commit()

    logger.info(
        "softpos: cobro procesado",
        txn_id=txn.id,
        status=new_status,
        amount=str(amount),
        card_last4=card_info["last4"],
    )

    return {
        "transaction_id":     txn.id,
        "status":             new_status,
        "amount":             str(amount),
        "currency":           currency,
        "card_brand":         medianet_result.get("card_brand",  card_info["brand"]),
        "card_last4":         medianet_result.get("card_last4",  card_info["last4"]),
        "authorization_code": medianet_result.get("authorization"),
        "medianet_ref":       medianet_result.get("payment_reference"),
        "description":        description,
    }
