"""
Tests de SSRF — protección contra Server-Side Request Forgery en webhook URLs.

W5: URL con IP privada (127.0.0.1, 10.x, 192.168.x) → ValidationError
W6: URL con IP del metadata de GCP (169.254.169.254) → ValidationError
    URL con hostname metadata.google.internal → ValidationError

La validación ocurre en el schema Pydantic WebhookUpdateRequest antes de
que el request llegue a la DB o a cualquier servicio. Son tests puros de modelo.
"""

import pytest
from pydantic import ValidationError

from app.schemas.auth import WebhookUpdateRequest


# ── Helper ────────────────────────────────────────────────────────────────────

def _valid_request(**overrides) -> dict:
    return {
        "webhook_url": "https://miapp.ejemplo.com/webhook",
        "webhook_secret": "mi-secreto-seguro",
        **overrides,
    }


# ── W5: IPs privadas ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("url", [
    "http://127.0.0.1/hook",
    "http://127.0.0.1:8080/hook",
    "https://127.0.0.1/hook",
    "http://10.0.0.1/hook",
    "http://10.255.255.255/hook",
    "http://192.168.1.1/hook",
    "http://192.168.100.50/hook",
    "http://172.16.0.1/hook",
    "http://172.31.255.255/hook",
    "http://0.0.0.0/hook",
    "http://localhost/hook",
    "http://localhost:9000/hook",
])
def test_private_ip_webhook_url_is_rejected(url):
    with pytest.raises(ValidationError, match=r"(?i)(privada|ssrf|bloqueada|blocked|private|not allowed|invalid|internos)"):
        WebhookUpdateRequest(**_valid_request(webhook_url=url))


# ── W6: IP de metadata de GCP ────────────────────────────────────────────────

@pytest.mark.parametrize("url", [
    "http://169.254.169.254/computeMetadata/v1/",
    "http://169.254.169.254/",
    "https://169.254.169.254/hook",
])
def test_gcp_metadata_ip_is_rejected(url):
    """169.254.169.254 es link-local — cualquier cloud provider lo usa para metadata."""
    with pytest.raises(ValidationError):
        WebhookUpdateRequest(**_valid_request(webhook_url=url))


@pytest.mark.parametrize("url", [
    "http://metadata.google.internal/hook",
    "http://anything.internal/hook",
    "http://service.local/hook",
])
def test_internal_hostnames_are_rejected(url):
    with pytest.raises(ValidationError):
        WebhookUpdateRequest(**_valid_request(webhook_url=url))


# ── URLs válidas que deben pasar ──────────────────────────────────────────────

@pytest.mark.parametrize("url", [
    "https://webhook.ejemplo.com/endpoint",
    "https://mi-app.ec/pagos/callback",
    "https://api.mitienda.com/medinetpay/webhook",
    "http://webhook.ejemplo.com/hook",   # HTTP público (no HTTPS) debe pasar validación SSRF
])
def test_valid_public_urls_are_accepted(url):
    req = WebhookUpdateRequest(**_valid_request(webhook_url=url))
    assert req.webhook_url == url
