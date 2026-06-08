"""
Conector hacia el API WebCheckout de MediaNet.

Flujo real:
  1. create_checkout_link() → POST /app/webservice/webcheckout/rest
     → devuelve {"link": "https://..."} (URL hosted de MediaNet)
  2. El cliente es redirigido a ese link
  3. Tras el pago, MediaNet hace POST a nuestra url_back con el resultado
     → process_callback() en el webhook handler actualiza la transacción

En producción: cambiar MEDIANET_API_URL a https://api.medianetpay.ec:4443
Auth: key_webservice + username van DENTRO del body JSON (no en headers).

Circuit breaker: 5 fallos → abre el circuito por 60 segundos.
"""

import json
import time
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import settings
from app.utils.logger import get_logger
from app.modules.connector.exceptions import (
    CircuitOpenError,
    MediaNetConnectionError,
    MediaNetDeclinedError,
    MediaNetError,
)

logger = get_logger(__name__)

_CIRCUIT_FAILURE_THRESHOLD = 5
_CIRCUIT_RECOVERY_SECONDS = 60


class MediaNetConnector:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._failures = 0
        self._circuit_opened_at: float | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.medianet_api_url,
                timeout=settings.medianet_timeout_seconds,
                headers={"Content-Type": "application/json"},
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Circuit breaker ───────────────────────────────────────────────────────

    def _is_circuit_open(self) -> bool:
        if self._circuit_opened_at is None:
            return False
        if time.time() - self._circuit_opened_at > _CIRCUIT_RECOVERY_SECONDS:
            logger.info("connector: circuit breaker cerrado — reintentando MediaNet")
            self._circuit_opened_at = None
            self._failures = 0
            return False
        return True

    def _record_success(self) -> None:
        self._failures = 0
        self._circuit_opened_at = None

    def _record_failure(self) -> None:
        self._failures += 1
        if self._failures >= _CIRCUIT_FAILURE_THRESHOLD:
            self._circuit_opened_at = time.time()
            logger.error("connector: circuit breaker ABIERTO", failures=self._failures)

    # ── Request base con retry ────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(MediaNetConnectionError),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        reraise=True,
    )
    async def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        if self._is_circuit_open():
            raise CircuitOpenError("Circuit breaker abierto — MediaNet no disponible")

        body_str = json.dumps(body or {})

        try:
            client = await self._get_client()
            response = await client.request(method, path, content=body_str)
        except httpx.TimeoutException as exc:
            self._record_failure()
            raise MediaNetConnectionError(f"Timeout conectando a MediaNet: {exc}") from exc
        except httpx.RequestError as exc:
            self._record_failure()
            raise MediaNetConnectionError(f"Error de red hacia MediaNet: {exc}") from exc

        data: dict[str, Any] = {}
        try:
            data = response.json()
        except Exception:
            logger.warning(
                "connector: respuesta de MediaNet no es JSON válido",
                status=response.status_code,
                body=response.text[:500],
            )

        if response.status_code == 401:
            from app.modules.connector.exceptions import MediaNetAuthError
            raise MediaNetAuthError("Credenciales MediaNet inválidas (key_webservice o username)", 401, data)

        if response.status_code == 422:
            raise MediaNetDeclinedError(
                data.get("message", "Pago declinado"), 422, data
            )

        if response.status_code >= 500:
            self._record_failure()
            raise MediaNetConnectionError(
                f"MediaNet error interno {response.status_code}", response.status_code, data
            )

        if not response.is_success:
            raise MediaNetError(
                data.get("message", f"Error {response.status_code}"), response.status_code, data
            )

        self._record_success()
        return data

    # ── Métodos públicos ──────────────────────────────────────────────────────

    async def create_checkout_link(
        self,
        *,
        amount: str,
        currency: str,
        description: str,
        reference: str,
        url_back: str,
        url_redirect: str,
        iva: int = 15,
        person_name: str | None = None,
        person_lastname: str | None = None,
        person_email: str | None = None,
        person_document: str | None = None,
        person_document_type: str = "CC",
        person_phone: str | None = None,
        person_city: str | None = None,
    ) -> dict:
        """
        Crea una sesión WebCheckout en MediaNet.
        Devuelve {"link": "https://..."} — URL de la página de pago hosted de MediaNet.

        En producción apunta a:
          https://api.medianetpay.ec:4443/app/webservice/webcheckout/rest
        En desarrollo apunta al mock:
          http://localhost:9000/app/webservice/webcheckout/rest

        Auth: key_webservice y username van en el body (no en headers).
        reference: max 40 chars — se usa para identificar la transacción en el callback.
        """
        value = float(amount)
        value_base = round(value / (1 + iva / 100), 2)

        body: dict[str, Any] = {
            "currency": currency,
            "description": description[:200],
            "iva": iva,
            "key_webservice": settings.medianet_api_key,
            "reference": reference[:40],
            "url_back": url_back,
            "url_redirect": url_redirect,
            "username": settings.medianet_api_username,
            "value": value,
            "value_base_not_iva": value_base,
        }

        # person_data es opcional pero ayuda al sistema antifraude
        person_data: dict[str, str] = {}
        if person_name:
            person_data["person_name"] = person_name
        if person_lastname:
            person_data["person_lastname"] = person_lastname
        if person_email:
            person_data["person_email"] = person_email
        if person_document:
            person_data["person_document"] = person_document
            person_data["person_document_type"] = person_document_type
        if person_phone:
            person_data["person_phone"] = person_phone
        if person_city:
            person_data["person_city"] = person_city
        if person_data:
            body["person_data"] = person_data

        logger.info(
            "connector: create_checkout_link",
            reference=reference[:40],
            amount=amount,
            url_back=url_back,
        )
        return await self._request("POST", "/app/webservice/webcheckout/rest", body)

    async def create_refund(
        self,
        *,
        medianet_ref: str,
        amount: str,
        reason: str | None = None,
    ) -> dict:
        """Crea un reembolso de un cobro aprobado."""
        logger.info("connector: create_refund", ref=medianet_ref, amount=amount)
        return await self._request("POST", "/api/v1/refunds", {
            "charge_ref": medianet_ref,
            "amount": amount,
            "reason": reason or "",
        })


# Singleton — una instancia por proceso
connector = MediaNetConnector()
