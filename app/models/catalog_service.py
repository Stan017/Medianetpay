from datetime import datetime
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class CatalogService(Base):
    __tablename__ = "catalog_services"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Token del PaymentLink pre-generado para checkout directo
    payment_link_token: Mapped[str | None] = mapped_column(String(200), nullable=True)
    position: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
