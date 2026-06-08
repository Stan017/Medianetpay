from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.auth import require_secret_key, require_any_key
from app.models.merchant import Merchant
from app.modules.payments.refund_service import create_refund, get_refund
from app.schemas.refunds import RefundCreate, RefundResponse

router = APIRouter(prefix="/v1/refunds", tags=["refunds"])


@router.post("", response_model=RefundResponse, status_code=status.HTTP_201_CREATED)
async def create_refund_endpoint(
    body: RefundCreate,
    merchant: Merchant = Depends(require_secret_key),
    db: AsyncSession = Depends(get_db),
) -> RefundResponse:
    try:
        refund = await create_refund(
            db,
            merchant_id=merchant.id,
            transaction_id=body.transaction_id,
            amount=body.amount,
            reason=body.reason,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "refund_error", "message": str(exc)},
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": str(exc)},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "refund_failed", "message": f"El reembolso falló al procesarse: {exc}"},
        )
    return RefundResponse.model_validate(refund)


@router.get("/{refund_id}", response_model=RefundResponse)
async def get_refund_endpoint(
    refund_id: str,
    merchant: Merchant = Depends(require_any_key),
    db: AsyncSession = Depends(get_db),
) -> RefundResponse:
    refund = await get_refund(db, refund_id)
    if not refund or refund.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "refund_not_found", "message": f"Reembolso {refund_id} no encontrado"},
        )
    return RefundResponse.model_validate(refund)
