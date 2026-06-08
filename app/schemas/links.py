from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class PaymentLinkCreate(BaseModel):
    amount: Decimal | None = Field(
        default=None, gt=0,
        description="Monto fijo. Si es null el cliente ingresa el monto."
    )
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    description: str = Field(..., min_length=1, max_length=255)
    expires_in_hours: int | None = Field(
        default=None, gt=0,
        description="Horas hasta que el link expira. Alternativa a expires_at."
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Fecha/hora exacta de expiración. Alternativa a expires_in_hours."
    )
    max_uses: int | None = Field(
        default=None, gt=0,
        description="Máximo de usos. Null = ilimitado."
    )


class PaymentLinkResponse(BaseModel):
    id: str
    merchant_id: str
    token: str
    amount: Decimal | None
    currency: str
    description: str
    expires_at: datetime | None
    max_uses: int | None
    uses_count: int
    status: str
    qr_png_url: str | None
    checkout_url: str
    created_at: datetime

    model_config = {"from_attributes": True}
