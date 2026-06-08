from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.auth import require_secret_key, require_any_key
from app.models.merchant import Merchant
from app.modules.payments.service import create_webcheckout_charge, get_charge
from app.modules.webhooks.service import fire_charge_webhook
from app.schemas.charges import ChargeCreate, ChargeResponse

router = APIRouter(prefix="/v1/charges", tags=["charges"])


@router.post("", response_model=ChargeResponse, status_code=status.HTTP_201_CREATED)
async def create_charge_endpoint(
    body: ChargeCreate,
    merchant: Merchant = Depends(require_secret_key),
    db: AsyncSession = Depends(get_db),
) -> ChargeResponse:
    """
    Crea un cobro WebCheckout.

    Devuelve la transacción en estado 'pending' con redirect_url.
    El comercio debe redirigir al cliente a redirect_url para que complete el pago
    en la página hosted de MediaNet.

    Cuando el cliente paga, MediaNet llama al webhook del comercio con el resultado.
    """
    txn, payment_url = await create_webcheckout_charge(
        db,
        merchant_id=merchant.id,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        idempotency_key=body.idempotency_key,
        installments=body.installments,
        customer_email=body.customer_email,
        customer_name=body.customer_name,
        customer_ruc_cedula=body.customer_ruc_cedula,
        metadata=body.extra_data,
    )

    response = ChargeResponse.model_validate(txn)
    response.redirect_url = payment_url or None
    return response


@router.get("/{charge_id}", response_model=ChargeResponse)
async def get_charge_endpoint(
    charge_id: str,
    merchant: Merchant = Depends(require_any_key),
    db: AsyncSession = Depends(get_db),
) -> ChargeResponse:
    txn = await get_charge(db, charge_id)
    if not txn or txn.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "charge_not_found", "message": f"Cobro {charge_id} no encontrado"},
        )
    return ChargeResponse.model_validate(txn)
