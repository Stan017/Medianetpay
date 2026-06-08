from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    extra_data: Mapped[dict] = mapped_column(JSONB, name="metadata", default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
