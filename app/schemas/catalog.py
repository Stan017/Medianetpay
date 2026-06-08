from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=300)
    price: Decimal = Field(..., gt=0)
    position: int | None = Field(None, ge=1, le=10)


class ServiceUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=300)
    price: Decimal | None = Field(None, gt=0)
    position: int | None = Field(None, ge=1, le=10)
    active: bool | None = None


class ServiceOut(BaseModel):
    id: str
    merchant_id: str
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    payment_link_token: str | None
    position: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class VitrinaProfileUpdate(BaseModel):
    bio: str | None = Field(None, max_length=120)


class VitrinaActivate(BaseModel):
    active: bool


class VitrinaOut(BaseModel):
    slug: str | None
    bio: str | None
    profile_image_url: str | None
    vitrina_active: bool
    vitrina_url: str | None
    services: list[ServiceOut]


# ── Respuesta pública (sin datos sensibles) ──────────────────────────────────

class PublicServiceOut(BaseModel):
    id: str
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    payment_link_token: str

    model_config = {"from_attributes": True}


class PublicVitrinaOut(BaseModel):
    slug: str
    business_name: str
    bio: str | None
    profile_image_url: str | None
    services: list[PublicServiceOut]
