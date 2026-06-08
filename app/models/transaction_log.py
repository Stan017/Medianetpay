from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class TransactionLog(Base):
    __tablename__ = "transaction_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String, ForeignKey("transactions.id"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String, nullable=True)
    to_status: Mapped[str] = mapped_column(String, nullable=False)
    medianet_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    triggered_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
