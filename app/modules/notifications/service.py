import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.notification import Notification
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def create(
    db: AsyncSession,
    *,
    merchant_id: str,
    type: str,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> Notification:
    notif = Notification(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        type=type,
        title=title,
        body=body,
        read=False,
        extra_data=metadata or {},
    )
    db.add(notif)
    await db.flush()
    logger.info("notification: creada", id=notif.id, merchant=merchant_id, type=type)
    return notif


async def list_for_merchant(
    db: AsyncSession,
    merchant_id: str,
    limit: int = 50,
) -> list[Notification]:
    rows = await db.scalars(
        select(Notification)
        .where(Notification.merchant_id == merchant_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(rows)


async def mark_read(db: AsyncSession, notification_id: str, merchant_id: str) -> bool:
    result = await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.merchant_id == merchant_id)
        .values(read=True)
    )
    await db.flush()
    return result.rowcount > 0


async def mark_all_read(db: AsyncSession, merchant_id: str) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.merchant_id == merchant_id, Notification.read == False)  # noqa: E712
        .values(read=True)
    )
    await db.flush()


async def register_push_token(db: AsyncSession, merchant_id: str, token: str) -> None:
    merchant = await db.get(Merchant, merchant_id)
    if merchant:
        merchant.push_token = token
        await db.flush()
        logger.info("notification: push token registrado", merchant=merchant_id)
