from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String, default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String, nullable=True)
    installments: Mapped[int] = mapped_column(Integer, default=1)
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    medianet_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_link_id: Mapped[str | None] = mapped_column(String, ForeignKey("payment_links.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    # ── Datos del comprador (limpios para factura electrónica SRI) ────────────
    customer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String, nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    customer_ruc_cedula: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    customer_id_type: Mapped[str | None] = mapped_column(String, nullable=True)
    # ruc | cedula | pasaporte | consumidor_final
    customer_address: Mapped[str | None] = mapped_column(String, nullable=True)
    # ── Factura electrónica SRI ───────────────────────────────────────────────
    invoice_status: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    # NULL = no solicitada | emitted | authorized | cancelled
    extra_data: Mapped[dict] = mapped_column(JSONB, name="metadata", default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
