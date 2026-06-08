"""
GET  /v1/notifications           — lista de notificaciones del comercio autenticado
POST /v1/notifications/{id}/read — marcar una como leída
POST /v1/notifications/read-all  — marcar todas como leídas
POST /v1/notifications/push-token — registrar token de push notifications
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.notifications import service as notification_service
from app.schemas.notification import NotificationListResponse, NotificationOut, PushTokenRequest

router = APIRouter(prefix="/v1/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    notifications = await notification_service.list_for_merchant(db, merchant.id)
    unread_count = sum(1 for n in notifications if not n.read)
    return NotificationListResponse(
        items=[NotificationOut.model_validate(n) for n in notifications],
        unread_count=unread_count,
    )


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    await notification_service.mark_all_read(db, merchant.id)
    await db.commit()


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    body: PushTokenRequest,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    await notification_service.register_push_token(db, merchant.id, body.push_token)
    await db.commit()


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    found = await notification_service.mark_read(db, notification_id, merchant.id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Notificación no encontrada"},
        )
    await db.commit()
