from decimal import Decimal
from pydantic import BaseModel, Field


class PublicChargeRequest(BaseModel):
    """
    Datos que el frontend envía al iniciar un pago WebCheckout.
    Ya no se recogen datos de tarjeta — el pago ocurre en la página hosted de MediaNet.
    """
    amount: Decimal | None = Field(
        default=None, gt=0, le=Decimal("50000"),
        description="Requerido solo si el link no tiene monto fijo."
    )
    customer_email: str | None = Field(default=None, max_length=100)
    customer_name: str | None = Field(default=None, max_length=100)
    customer_ruc_cedula: str | None = Field(
        default=None,
        description="Cédula (10 dígitos) o RUC (13 dígitos). Mejora el antifraude.",
    )
    idempotency_key: str = Field(..., min_length=1, max_length=100)


class PublicChargeResponse(BaseModel):
    """
    Respuesta al iniciar un pago. El frontend debe redirigir al redirect_url.
    La transacción queda en 'pending' hasta que MediaNet confirme el pago.
    """
    transaction_id: str
    status: str          # siempre "pending" en este punto
    amount: str
    currency: str
    redirect_url: str    # URL de la página de pago hosted de MediaNet
