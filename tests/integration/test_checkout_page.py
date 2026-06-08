"""
Integration tests para app/api/v1/checkout.py.

Cubren:
  - GET  /pay/{token}       → renderizado HTML (monto fijo vs libre)
  - POST /pay/{token}/charge → endpoint de cobro público

Se mockean get_link_by_token y public_charge para no depender de DB ni MediaNet.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock

from tests.conftest import make_link, make_merchant

PATCH_GET_LINK = "app.api.v1.checkout.get_link_by_token"
PATCH_PUBLIC_CHARGE = "app.api.v1.checkout.public_charge"


# ── GET /pay/{token} — monto fijo ─────────────────────────────────────────────

async def test_fixed_amount_page_shows_amount_in_header(client, mock_db):
    """Link fijo: el header muestra el monto y el símbolo $."""
    link = make_link(amount=Decimal("25.00"), description="Almuerzo del día")
    merchant = make_merchant()
    mock_db.get.return_value = merchant

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/test-token-abc")

    assert r.status_code == 200
    html = r.text
    assert "25.00" in html
    assert "Almuerzo del día" in html


async def test_fixed_amount_page_sets_js_variable(client, mock_db):
    """FIXED_AMOUNT en JS debe ser el monto numérico, no null."""
    link = make_link(amount=Decimal("25.00"))
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/test-token-abc")

    assert "FIXED_AMOUNT = 25.00" in r.text


async def test_fixed_amount_page_has_no_free_amount_input(client, mock_db):
    """Link fijo no debe renderizar el campo de monto libre."""
    link = make_link(amount=Decimal("25.00"))
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/test-token-abc")

    assert 'id="f-amount"' not in r.text


async def test_fixed_amount_page_button_label(client, mock_db):
    """Botón debe decir 'Continuar al pago · $25.00 USD'."""
    link = make_link(amount=Decimal("25.00"), currency="USD")
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/test-token-abc")

    assert "Continuar al pago" in r.text
    assert "25.00" in r.text


# ── GET /pay/{token} — monto libre ───────────────────────────────────────────

async def test_free_amount_page_shows_question_header(client, mock_db):
    """Link libre: el header muestra '¿Cuánto quieres pagar?' en lugar de un monto."""
    link = make_link(amount=None, description="Corte de cabello")
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert r.status_code == 200
    html = r.text
    assert "¿Cuánto quieres pagar?" in html
    assert "Corte de cabello" in html


async def test_free_amount_page_has_no_dollar_libre(client, mock_db):
    """Link libre NO debe mostrar '$Libre' — sería confuso para el usuario."""
    link = make_link(amount=None)
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert "$Libre" not in r.text
    assert ">Libre<" not in r.text


async def test_free_amount_page_sets_js_null(client, mock_db):
    """FIXED_AMOUNT debe ser null en el JS cuando el link es libre."""
    link = make_link(amount=None)
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert "FIXED_AMOUNT = null" in r.text


async def test_free_amount_page_has_amount_input(client, mock_db):
    """Link libre debe renderizar el campo de input con id='f-amount'."""
    link = make_link(amount=None)
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert 'id="f-amount"' in r.text


async def test_free_amount_page_has_update_btn_function(client, mock_db):
    """El JS debe tener la función updateBtn para actualizar el botón en tiempo real."""
    link = make_link(amount=None)
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert "updateBtn" in r.text
    assert "oninput" in r.text


async def test_free_amount_page_button_default_label(client, mock_db):
    """Botón inicial de link libre debe invitar a ingresar monto."""
    link = make_link(amount=None)
    mock_db.get.return_value = make_merchant()

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/free-token")

    assert "Ingresar monto para continuar" in r.text


# ── GET /pay/{token} — errores de estado del link ────────────────────────────

async def test_page_returns_404_when_link_not_found(client, mock_db):
    """Token inexistente → 404."""
    with patch(PATCH_GET_LINK, return_value=None):
        r = await client.get("/pay/ghost-token")

    assert r.status_code == 404
    assert "no encontrado" in r.text.lower()


async def test_page_returns_410_when_link_inactive(client, mock_db):
    """Link inactivo → 410."""
    link = make_link(status="inactive")

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/inactive-token")

    assert r.status_code == 410


async def test_page_returns_410_when_link_expired(client, mock_db):
    """Link expirado (expires_at en el pasado) → 410."""
    expired_at = datetime.now(timezone.utc) - timedelta(hours=2)
    link = make_link(expires_at=expired_at)

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/expired-token")

    assert r.status_code == 410
    assert "expirado" in r.text.lower()


async def test_page_returns_410_when_max_uses_reached(client, mock_db):
    """Link con max_uses agotado → 410."""
    link = make_link(max_uses=3, uses_count=3)

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/maxed-token")

    assert r.status_code == 410
    assert "máximo" in r.text.lower()


async def test_page_shows_test_hint_in_test_mode(client, mock_db):
    """Cuando el comercio está en modo prueba, el hint de testeo debe aparecer."""
    link = make_link(amount=Decimal("10.00"))
    mock_db.get.return_value = make_merchant(test_mode=True)

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/test-mode-token")

    assert "Modo prueba" in r.text or "modo prueba" in r.text


async def test_page_no_test_hint_in_production_mode(client, mock_db):
    """En modo producción, el contenido del hint de test NO debe aparecer."""
    link = make_link(amount=Decimal("10.00"))
    mock_db.get.return_value = make_merchant(test_mode=False)

    with patch(PATCH_GET_LINK, return_value=link):
        r = await client.get("/pay/prod-token")

    # El texto específico del hint solo aparece cuando test_mode=True
    assert "Modo prueba" not in r.text
    assert "simulador de pagos" not in r.text


# ── POST /pay/{token}/charge ─────────────────────────────────────────────────

async def test_charge_free_amount_success(client, mock_db):
    """POST con monto libre y amount en el body → 200 con redirect_url."""
    charge_result = {
        "transaction_id": "txn-uuid-1",
        "status": "pending",
        "amount": "15.00",
        "currency": "USD",
        "redirect_url": "https://pay.medianet.ec/checkout/xyz123",
    }

    with patch(PATCH_PUBLIC_CHARGE, return_value=charge_result):
        r = await client.post("/pay/free-token/charge", json={
            "amount": 15.00,
            "idempotency_key": "unique-key-1",
            "customer_name": "Juan Pérez",
            "customer_email": None,
            "customer_ruc_cedula": None,
        })

    assert r.status_code == 200
    data = r.json()
    assert data["redirect_url"] == "https://pay.medianet.ec/checkout/xyz123"
    assert data["status"] == "pending"
    assert data["amount"] == "15.00"


async def test_charge_fixed_amount_success(client, mock_db):
    """POST sin amount en el body (link fijo) → 200 con redirect_url."""
    charge_result = {
        "transaction_id": "txn-uuid-2",
        "status": "pending",
        "amount": "50.00",
        "currency": "USD",
        "redirect_url": "https://pay.medianet.ec/checkout/abc456",
    }

    with patch(PATCH_PUBLIC_CHARGE, return_value=charge_result):
        r = await client.post("/pay/fixed-token/charge", json={
            "idempotency_key": "unique-key-2",
        })

    assert r.status_code == 200
    assert r.json()["redirect_url"] == "https://pay.medianet.ec/checkout/abc456"


async def test_charge_value_error_returns_422(client, mock_db):
    """Si public_charge lanza ValueError → 422 con code checkout_error."""
    with patch(PATCH_PUBLIC_CHARGE, side_effect=ValueError("Este link requiere que ingreses un monto")):
        r = await client.post("/pay/free-token/charge", json={
            "idempotency_key": "unique-key-3",
        })

    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail["code"] == "checkout_error"
    assert "monto" in detail["message"].lower()


async def test_charge_medianet_failure_returns_502(client, mock_db):
    """Si public_charge retorna status=failed → 502."""
    with patch(PATCH_PUBLIC_CHARGE, return_value={"status": "failed"}):
        r = await client.post("/pay/fixed-token/charge", json={
            "idempotency_key": "unique-key-4",
        })

    assert r.status_code == 502
    detail = r.json()["detail"]
    assert detail["code"] == "medianet_error"


async def test_charge_missing_idempotency_key_returns_422(client, mock_db):
    """El campo idempotency_key es requerido — sin él Pydantic rechaza la request."""
    r = await client.post("/pay/any-token/charge", json={
        "amount": 10.00,
        # idempotency_key ausente
    })

    assert r.status_code == 422


async def test_charge_negative_amount_returns_422(client, mock_db):
    """Monto negativo o cero → Pydantic rechaza (gt=0 en el schema)."""
    r = await client.post("/pay/any-token/charge", json={
        "amount": -5.00,
        "idempotency_key": "unique-key-5",
    })

    assert r.status_code == 422
