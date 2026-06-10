import ipaddress
from datetime import datetime
from urllib.parse import urlparse

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=200)
    ruc: str = Field(..., min_length=13, max_length=13)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("ruc")
    @classmethod
    def validate_ruc(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 13:
            raise ValueError("RUC debe tener exactamente 13 dígitos numéricos")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    merchant_id: str
    business_name: str
    # Solo presente en register — visible UNA sola vez
    sk_test: str | None = None
    pk_test: str | None = None


class MerchantProfile(BaseModel):
    id: str
    business_name: str
    ruc: str
    email: str
    api_key_public: str
    webhook_url: str | None
    status: str
    test_mode: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookUpdateRequest(BaseModel):
    webhook_url: str = Field(..., max_length=500)
    webhook_secret: str = Field(..., min_length=8, max_length=200)

    @field_validator("webhook_url")
    @classmethod
    def no_ssrf(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("webhook_url debe usar http:// o https://")
        host = (parsed.hostname or "").lower()
        if not host:
            raise ValueError("webhook_url inválido")
        _blocked = {"localhost", "0.0.0.0", "metadata.google.internal"}
        if host in _blocked or host.endswith(".internal") or host.endswith(".local"):
            raise ValueError("webhook_url no puede apuntar a servicios internos")
        try:
            addr = ipaddress.ip_address(host)
            if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
                raise ValueError("webhook_url no puede apuntar a una red privada o loopback")
        except ValueError as exc:
            if "webhook_url" in str(exc):
                raise
        return v
