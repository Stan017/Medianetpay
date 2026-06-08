from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.payments.softpos_service import create_softpos_charge
from app.schemas.softpos import SoftPOSChargeRequest, SoftPOSChargeResponse

router = APIRouter(prefix="/v1/softpos", tags=["softpos"])


@router.post("/charge", response_model=SoftPOSChargeResponse, status_code=201)
async def softpos_charge(
    body: SoftPOSChargeRequest,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> SoftPOSChargeResponse:
    """
    Cobro SoftPOS — tarjeta presente (datáfono móvil).

    Resultado sincrónico: no hay redirect. La respuesta incluye
    el estado final (completed/failed), marca, últimos 4 dígitos
    y código de autorización.

    En simulación, el campo `card_token` determina el resultado:
    - "4242" → Visa aprobada
    - "0002" → Visa rechazada
    - "5500" → Mastercard aprobada

    En producción, el SDK certificado de MediaNet reemplaza
    card_token por el token EMV encriptado del chip.
    """
    result = await create_softpos_charge(
        db,
        merchant_id=merchant.id,
        amount=body.amount,
        currency=body.currency,
        description=body.description,
        idempotency_key=body.idempotency_key,
        card_token=body.card_token,
        customer_name=body.customer_name,
        customer_id_type=body.customer_id_type,
        customer_ruc_cedula=body.customer_ruc_cedula,
        customer_email=body.customer_email,
        customer_phone=body.customer_phone,
        customer_address=body.customer_address,
        installments=body.installments,
    )
    return SoftPOSChargeResponse(**result)
