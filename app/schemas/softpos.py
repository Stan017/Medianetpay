from decimal import Decimal
from pydantic import BaseModel, Field

# Tarjetas de prueba disponibles en el simulador
MOCK_CARDS: dict[str, dict] = {
    "4242": {"brand": "Visa",       "last4": "4242", "approved": True},
    "0002": {"brand": "Visa",       "last4": "0002", "approved": False},
    "5500": {"brand": "Mastercard", "last4": "5500", "approved": True},
}


class SoftPOSChargeRequest(BaseModel):
    amount:          Decimal = Field(..., gt=0, decimal_places=2)
    description:     str     = Field(..., min_length=1, max_length=255)
    idempotency_key: str     = Field(..., min_length=1, max_length=100)
    card_token:      str     = Field(default="4242", description="Token de tarjeta de prueba: 4242|0002|5500")
    # ── Datos del comprador para factura electrónica SRI ──────────────────────
    customer_name:        str | None = Field(default=None, description="Nombre o razón social")
    customer_id_type:     str | None = Field(default=None, description="ruc|cedula|pasaporte|consumidor_final")
    customer_ruc_cedula:  str | None = Field(default=None, description="Número de identificación")
    customer_email:       str | None = Field(default=None)
    customer_phone:       str | None = Field(default=None)
    customer_address:     str | None = Field(default=None)
    installments:    int    = Field(default=1)
    currency:        str    = Field(default="USD")


class SoftPOSChargeResponse(BaseModel):
    transaction_id:     str
    status:             str        # "completed" | "failed"
    amount:             str
    currency:           str
    card_brand:         str
    card_last4:         str
    authorization_code: str | None
    medianet_ref:       str | None
    description:        str
