from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ChargeCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, examples=[50.00])
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    description: str = Field(..., min_length=1, max_length=255)
    idempotency_key: str = Field(..., min_length=1, max_length=100)
    installments: int = Field(default=1, ge=1, le=24)
    customer_email: str | None = Field(default=None)
    customer_name: str | None = Field(default=None)
    customer_ruc_cedula: str | None = Field(default=None, description="Cédula (10 dígitos) o RUC (13 dígitos) del pagador")
    extra_data: dict = Field(default_factory=dict, alias="metadata")

    @field_validator("installments")
    @classmethod
    def valid_installments(cls, v: int) -> int:
        allowed = {1, 3, 6, 9, 12, 24}
        if v not in allowed:
            raise ValueError(f"installments debe ser uno de: {sorted(allowed)}")
        return v


class ChargeResponse(BaseModel):
    id: str
    merchant_id: str
    amount: Decimal
    currency: str
    status: str
    payment_method: str | None
    installments: int
    idempotency_key: str
    medianet_ref: str | None
    description: str | None
    # ── Datos del comprador ────────────────────────────────────────────────────
    customer_email: str | None
    customer_name: str | None = None
    customer_ruc_cedula: str | None = None
    customer_id_type: str | None = None
    # ruc | cedula | pasaporte | consumidor_final
    customer_phone: str | None = None
    customer_address: str | None = None
    # ── Factura electrónica SRI ───────────────────────────────────────────────
    invoice_status: str | None = None
    # NULL = no solicitada | emitted | authorized | cancelled
    # validation_alias lee t.extra_data; el campo se serializa como "metadata" en JSON
    metadata: dict = Field(default_factory=dict, validation_alias="extra_data")
    # redirect_url: URL de la página de pago de MediaNet (presente cuando status="pending")
    redirect_url: str | None = Field(default=None, description="URL a la que redirigir al cliente para completar el pago")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
