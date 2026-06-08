import hashlib
import hmac as _hmac

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.middleware.auth import require_secret_key
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.modules.webhooks.service import send_test_webhook
from app.modules.payments.service import process_medianet_callback
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


class MediaNetCallbackBody(BaseModel):
    """Cuerpo del callback que MediaNet envía a url_back."""
    model_config = ConfigDict(extra="ignore")

    response: str = ""
    reference: str = ""
    amount: str = "0"
    currency: str = "USD"
    method: str = "card"
    payment_reference: str = ""
    authorization: str | None = None


def _verify_callback_sig(txn_id: str, sig: str) -> bool:
    """Verifica la firma HMAC que pusimos en url_back al crear el WebCheckout."""
    expected = _hmac.new(
        settings.secret_key.encode(),
        txn_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return _hmac.compare_digest(expected, sig)


@router.post("/test")
async def test_webhook_endpoint(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dispara un webhook de prueba al URL configurado por el comercio."""
    result = await send_test_webhook(merchant)
    return result


@router.post("/medianet-callback", include_in_schema=True)
async def medianet_callback(
    body: MediaNetCallbackBody,
    sig: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Recibe el callback POST de MediaNet tras el pago del cliente.

    MediaNet envía:
      {
        "response": "Aprobada" | "Rechazada",
        "reference": "<transaction_id que enviamos>",
        "currency": "USD",
        "amount": "100.00",
        "method": "VISA",
        "payment_reference": "MN-XXXXX",
        "authorization": "123456"  // solo si aprobada
      }

    Protección: cuando creamos el WebCheckout, firmamos url_back con HMAC-SHA256(secret_key, txn_id).
    MediaNet devuelve la URL intacta, así que verificamos la firma antes de procesar.
    """
    reference = body.reference

    logger.info(
        "medianet-callback: recibido",
        response=body.response,
        reference=reference,
        payment_ref=body.payment_reference,
    )

    if not reference:
        logger.warning("medianet-callback: sin reference")
        return JSONResponse({"ok": False, "error": "missing_reference"}, status_code=400)

    if not sig or not _verify_callback_sig(reference, sig):
        logger.warning("medianet-callback: firma inválida o ausente", reference=reference)
        return JSONResponse({"ok": False, "error": "invalid_signature"}, status_code=401)

    txn = await process_medianet_callback(
        db,
        response=body.response,
        reference=reference,
        amount=body.amount,
        currency=body.currency,
        method=body.method,
        payment_reference=body.payment_reference,
        authorization=body.authorization,
    )

    if not txn:
        logger.warning("medianet-callback: transacción no encontrada", reference=reference)
        # Devolvemos 200 para que MediaNet no reintente — la transacción puede no existir en este servidor
        return JSONResponse({"ok": False, "error": "transaction_not_found"}, status_code=200)

    # Opcional: notificar al webhook del comercio (si tiene configurado webhook_url)
    try:
        from app.models.merchant import Merchant
        merchant = await db.get(Merchant, txn.merchant_id)
        if merchant and merchant.webhook_url:
            from app.modules.webhooks.service import send_charge_webhook
            await send_charge_webhook(merchant, txn)
    except Exception as exc:
        logger.error("medianet-callback: error notificando al comercio", error=str(exc))

    return JSONResponse({"ok": True, "transaction_id": txn.id, "status": txn.status})
