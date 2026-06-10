"""
Servicio de webhooks salientes.

Fase 2: envío síncrono para el endpoint de prueba.
Fase 5: Celery queue con reintentos + backoff exponencial.

Firma: X-MediaNetPay-Signature: sha256={hmac_hex}
El comercio verifica la firma con su webhook_secret antes de procesar.
"""

import hashlib
import hmac
import ipaddress
import json
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from app.models.merchant import Merchant
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if not host:
            return False
        if host in {"localhost", "0.0.0.0", "metadata.google.internal"}:
            return False
        if host.endswith(".internal") or host.endswith(".local"):
            return False
        try:
            addr = ipaddress.ip_address(host)
            return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)
        except ValueError:
            return True
    except Exception:
        return False


def _sign_payload(payload: dict, secret: str) -> str:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        key=secret.encode(),
        msg=body.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()


async def send_test_webhook(merchant: Merchant) -> dict:
    """Dispara un webhook de prueba al URL configurado por el comercio."""
    if not merchant.webhook_url:
        return {"sent": False, "reason": "El comercio no tiene webhook_url configurada"}
    if not _is_safe_url(merchant.webhook_url):
        logger.warning("webhook: URL bloqueada por SSRF guard", merchant=merchant.id)
        return {"sent": False, "reason": "webhook_url apunta a una dirección no permitida"}

    payload = {
        "event": "test.ping",
        "merchant_id": merchant.id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "message": "Webhook de prueba de MediaNetPay",
            "docs": "https://medianetpay.ec/docs#webhooks",
        },
    }

    secret = merchant.webhook_secret or ""
    signature = _sign_payload(payload, secret)
    body = json.dumps(payload)

    headers = {
        "Content-Type": "application/json",
        "X-MediaNetPay-Signature": f"sha256={signature}",
        "X-MediaNetPay-Event": "test.ping",
        "User-Agent": "MediaNetPay-Webhook/1.0",
    }

    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(merchant.webhook_url, content=body, headers=headers)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "webhook: test enviado",
            merchant=merchant.id, status=response.status_code, elapsed_ms=elapsed_ms,
        )
        return {
            "sent": True,
            "webhook_url": merchant.webhook_url,
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "signature_header": f"sha256={signature}",
        }
    except httpx.RequestError as exc:
        logger.warning("webhook: test fallido", merchant=merchant.id, error=str(exc))
        return {
            "sent": False,
            "webhook_url": merchant.webhook_url,
            "reason": str(exc),
        }


async def send_charge_webhook(merchant: Merchant, transaction: object) -> None:
    """Alias público de fire_charge_webhook para el callback de MediaNet."""
    data = {c: getattr(transaction, c, None) for c in ["id", "status", "amount", "currency", "description", "medianet_ref"]}
    await fire_charge_webhook(merchant, {k: str(v) if v is not None else None for k, v in data.items()})


async def fire_charge_webhook(merchant: Merchant, transaction: dict) -> None:
    """Dispara el webhook de cobro completado. Fase 5: mover a Celery queue."""
    if not merchant.webhook_url:
        return
    if not _is_safe_url(merchant.webhook_url):
        logger.warning("webhook: URL bloqueada por SSRF guard", merchant=merchant.id)
        return

    payload = {
        "event": "charge.completed",
        "merchant_id": merchant.id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": transaction,
    }

    secret = merchant.webhook_secret or ""
    signature = _sign_payload(payload, secret)
    body = json.dumps(payload)
    headers = {
        "Content-Type": "application/json",
        "X-MediaNetPay-Signature": f"sha256={signature}",
        "X-MediaNetPay-Event": "charge.completed",
        "User-Agent": "MediaNetPay-Webhook/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(merchant.webhook_url, content=body, headers=headers)
        logger.info("webhook: charge.completed enviado", merchant=merchant.id)
    except Exception as exc:
        logger.warning("webhook: charge.completed fallido", merchant=merchant.id, error=str(exc))
