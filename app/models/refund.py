from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String, ForeignKey("transactions.id"), nullable=False)
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    medianet_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
