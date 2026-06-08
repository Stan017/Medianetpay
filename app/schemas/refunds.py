from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class RefundCreate(BaseModel):
    transaction_id: str = Field(..., description="ID de la transacción a reembolsar")
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: str | None = Field(default=None, max_length=255)


class RefundResponse(BaseModel):
    id: str
    transaction_id: str
    merchant_id: str
    amount: Decimal
    reason: str | None
    status: str
    medianet_ref: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
