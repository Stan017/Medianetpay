from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    ruc: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    api_key_public: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    api_key_secret_hash: Mapped[str] = mapped_column(String, nullable=False)
    api_key_secret_prefix: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    webhook_url: Mapped[str | None] = mapped_column(String, nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    test_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    push_token: Mapped[str | None] = mapped_column(String, nullable=True)
    # Vitrina pública
    slug: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    bio: Mapped[str | None] = mapped_column(String(120), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vitrina_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
