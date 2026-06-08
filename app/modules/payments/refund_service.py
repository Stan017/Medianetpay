import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.refund import Refund
from app.models.transaction import Transaction
from app.modules.connector.client import connector
from app.modules.payments.state_machine import assert_transition
from app.models.transaction_log import TransactionLog
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def create_refund(
    db: AsyncSession,
    *,
    merchant_id: str,
    transaction_id: str,
    amount: Decimal,
    reason: str | None = None,
) -> Refund:
    txn = await db.get(Transaction, transaction_id)
    if not txn:
        raise ValueError(f"Transacción {transaction_id} no encontrada")
    if txn.merchant_id != merchant_id:
        raise PermissionError("La transacción no pertenece a este comercio")
    if txn.status != "completed":
        raise ValueError(f"Solo se pueden reembolsar transacciones completadas. Estado actual: {txn.status}")
    if amount > txn.amount:
        raise ValueError(f"El monto del reembolso ({amount}) supera el cobro original ({txn.amount})")

    refund = Refund(
        id=str(uuid.uuid4()),
        transaction_id=transaction_id,
        merchant_id=merchant_id,
        amount=amount,
        reason=reason,
        status="pending",
    )
    db.add(refund)
    await db.flush()

    try:
        result = await connector.create_refund(
            medianet_ref=txn.medianet_ref,
            amount=str(amount),
            reason=reason,
        )
        refund.medianet_ref = result.get("ref")
        refund.status = "completed"

        # Avanzar estado de la transacción
        assert_transition(txn.status, "reversed")
        old_status = txn.status
        txn.status = "reversed"
        db.add(TransactionLog(
            id=str(uuid.uuid4()),
            transaction_id=txn.id,
            from_status=old_status,
            to_status="reversed",
            triggered_by="api",
        ))
        logger.info("refund: completado", txn=transaction_id, refund=refund.id)

    except Exception as exc:
        refund.status = "failed"
        await db.commit()
        logger.error("refund: fallido", txn=transaction_id, error=str(exc))
        # Re-raise para que el endpoint devuelva 502, no 201
        raise

    await db.commit()
    await db.refresh(refund)
    return refund


async def get_refund(db: AsyncSession, refund_id: str) -> Refund | None:
    return await db.get(Refund, refund_id)
