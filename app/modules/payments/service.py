"""
Servicio de pagos — lógica de negocio de cobros WebCheckout.

Flujo:
  1. create_webcheckout_charge() → crea txn en pending + obtiene link de MediaNet
  2. El cliente paga en la página hosted de MediaNet
  3. process_medianet_callback() → actualiza txn a completed/failed cuando MediaNet llama de vuelta
"""

import hashlib
import hmac as _hmac
import uuid
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.transaction import Transaction
from app.models.transaction_log import TransactionLog
from app.modules.connector.client import connector
from app.modules.connector.exceptions import MediaNetConnectionError, CircuitOpenError
from app.modules.payments.state_machine import assert_transition
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _make_callback_sig(txn_id: str) -> str:
    """HMAC-SHA256 para autenticar callbacks de MediaNet vía url_back."""
    return _hmac.new(
        settings.secret_key.encode(),
        txn_id.encode(),
        hashlib.sha256,
    ).hexdigest()


async def create_webcheckout_charge(
    db: AsyncSession,
    *,
    merchant_id: str,
    amount: Decimal,
    currency: str = "USD",
    description: str,
    idempotency_key: str,
    payment_link_id: str | None = None,
    link_token: str | None = None,
    customer_email: str | None = None,
    customer_name: str | None = None,
    customer_ruc_cedula: str | None = None,
    installments: int = 1,
    metadata: dict | None = None,
) -> tuple[Transaction, str]:
    """
    Crea un cobro WebCheckout:
      1. Idempotencia
      2. Crea transacción en pending
      3. Llama a MediaNet WebCheckout API -> obtiene payment link
      4. Retorna (txn, payment_link_url)

    La transacción queda en 'pending' hasta que MediaNet llame a url_back.
    """
    # ── 1. Idempotencia ───────────────────────────────────────────────────────
    existing = await db.scalar(
        select(Transaction).where(Transaction.idempotency_key == idempotency_key)
    )
    if existing:
        logger.info("payments: idempotency hit", key=idempotency_key, txn=existing.id)
        prev_link = (existing.extra_data or {}).get("medianet_link", "")
        return existing, prev_link

    # ── 2. Crear transacción en pending ───────────────────────────────────────
    txn = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        amount=amount,
        currency=currency,
        status="pending",
        idempotency_key=idempotency_key,
        description=description,
        installments=installments,
        customer_email=customer_email,
        customer_name=customer_name,
        customer_ruc_cedula=customer_ruc_cedula,
        payment_link_id=payment_link_id,
        extra_data=metadata or {},
    )
    db.add(txn)
    try:
        await db.flush()
    except IntegrityError:
        # Race condition: otra request con la misma idempotency_key llegó al mismo tiempo.
        # El UNIQUE constraint de la DB rechazó el INSERT — es seguro recuperar el existente.
        await db.rollback()
        existing = await db.scalar(
            select(Transaction).where(Transaction.idempotency_key == idempotency_key)
        )
        if existing:
            logger.info("payments: idempotency race resuelto", key=idempotency_key, txn=existing.id)
            prev_link = (existing.extra_data or {}).get("medianet_link", "")
            return existing, prev_link
        raise
    await _log(db, txn.id, None, "pending", "system")
    logger.info("payments: txn creada en pending", id=txn.id, amount=str(amount))

    # ── 3. Llamar a MediaNet WebCheckout ─────────────────────────────────────
    # Firma HMAC ligada al txn.id — MediaNet devuelve esta URL intacta en el callback,
    # lo que nos permite verificar que el POST vino de una sesión legítima que nosotros creamos.
    _sig = _make_callback_sig(txn.id)
    url_back = f"{settings.api_base_url}/v1/webhooks/medianet-callback?sig={_sig}"
    # Siempre apuntar a /payment-result — MediaNet añadirá ?response=Aprobada|Rechazada
    url_redirect = f"{settings.api_base_url}/payment-result?txn={txn.id}"

    doc_type = "RUC" if customer_ruc_cedula and len(customer_ruc_cedula) == 13 else "CC"

    payment_url = ""
    try:
        result = await connector.create_checkout_link(
            amount=str(amount),
            currency=currency,
            description=description,
            reference=txn.id,        # UUID 36 chars — dentro del límite de 40
            url_back=url_back,
            url_redirect=url_redirect,
            iva=15,
            person_name=customer_name,
            person_email=customer_email,
            person_document=customer_ruc_cedula,
            person_document_type=doc_type,
        )
        payment_url = result.get("link", "")
        txn.extra_data = {**(txn.extra_data or {}), "medianet_link": payment_url}
        logger.info("payments: link obtenido de MediaNet", txn=txn.id)

    except Exception as exc:
        logger.error("payments: error al crear checkout", txn=txn.id, error=str(exc))
        await _transition(db, txn, "failed", "system")
        await db.commit()
        await db.refresh(txn)
        raise

    await db.commit()
    await db.refresh(txn)
    return txn, payment_url


async def process_medianet_callback(
    db: AsyncSession,
    *,
    response: str,
    reference: str,
    amount: str,
    currency: str,
    method: str,
    payment_reference: str,
    authorization: str | None = None,
) -> Transaction | None:
    """
    Procesa el callback que MediaNet envía a url_back tras el pago.
    response 'Aprobada' -> completed, cualquier otro -> failed.
    reference es el transaction_id que enviamos a MediaNet.
    """
    txn = await db.scalar(
        select(Transaction).where(Transaction.id == reference)
    )
    if not txn:
        logger.warning("payments: callback sin txn", reference=reference)
        return None

    if txn.status != "pending":
        logger.info("payments: callback duplicado", txn=txn.id, status=txn.status)
        return txn

    # Validar que el monto del callback coincida con el cobro original.
    # Una discrepancia indica manipulación o bug grave en la integración.
    try:
        callback_amount = Decimal(amount)
        if abs(callback_amount - txn.amount) > Decimal("0.01"):
            logger.error(
                "payments: monto del callback no coincide — posible fraude",
                txn=txn.id,
                expected=str(txn.amount),
                received=amount,
            )
            return None
    except Exception:
        logger.error("payments: monto del callback inválido", txn=txn.id, amount=amount)
        return None

    approved = response.strip().lower() in ("aprobada", "approved", "aprobado")
    new_status = "completed" if approved else "failed"

    txn.medianet_ref = payment_reference
    txn.payment_method = method or "card"
    if authorization:
        txn.extra_data = {**(txn.extra_data or {}), "authorization": authorization}

    assert_transition(txn.status, new_status)
    await _transition(db, txn, new_status, "medianet")

    # Notificación al comercio
    from app.modules.notifications import service as notification_service
    if approved:
        notif_type = "link.paid" if txn.payment_link_id else "txn.approved"
        notif_title = "Link de cobro pagado" if txn.payment_link_id else "Pago aprobado ✓"
        await notification_service.create(
            db,
            merchant_id=txn.merchant_id,
            type=notif_type,
            title=notif_title,
            body=f"${txn.amount} recibido",
            metadata={"transaction_id": txn.id, "amount": str(txn.amount)},
        )
    else:
        await notification_service.create(
            db,
            merchant_id=txn.merchant_id,
            type="txn.failed",
            title="Pago rechazado",
            body=f"Tarjeta declinada — ${txn.amount}",
            metadata={"transaction_id": txn.id, "amount": str(txn.amount)},
        )

    await db.commit()
    await db.refresh(txn)
    logger.info("payments: callback procesado", txn=txn.id, status=new_status)
    return txn


async def get_charge(db: AsyncSession, transaction_id: str) -> Transaction | None:
    return await db.get(Transaction, transaction_id)


# ── Helpers internos ──────────────────────────────────────────────────────────

async def _transition(db: AsyncSession, txn: Transaction, to_status: str, triggered_by: str) -> None:
    from_status = txn.status
    txn.status = to_status
    await _log(db, txn.id, from_status, to_status, triggered_by)


async def _log(
    db: AsyncSession,
    transaction_id: str,
    from_status: str | None,
    to_status: str,
    triggered_by: str,
) -> None:
    db.add(TransactionLog(
        id=str(uuid.uuid4()),
        transaction_id=transaction_id,
        from_status=from_status,
        to_status=to_status,
        triggered_by=triggered_by,
    ))
    await db.flush()
