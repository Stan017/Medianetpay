"""
Unit tests para app/modules/links/checkout_service.py → public_charge().

Se mockean todas las dependencias externas (DB, MediaNet).
Sin red. Sin DB real. Cada test verifica exactamente una pieza de lógica.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.links.checkout_service import public_charge
from tests.conftest import make_link, make_merchant

PATCH_GET_LINK = "app.modules.links.checkout_service.get_link_by_token"
PATCH_CREATE_CHARGE = "app.modules.links.checkout_service.create_webcheckout_charge"


def _make_txn(amount: Decimal = Decimal("25.00")) -> MagicMock:
    """Mock de Transaction retornado por create_webcheckout_charge."""
    txn = MagicMock()
    txn.id = "txn-uuid-1"
    txn.status = "pending"
    txn.amount = amount
    txn.currency = "USD"
    txn.extra_data = None
    return txn


FAKE_REDIRECT = "https://pay.medianet.ec/checkout/xyz123"


# ── Monto libre ───────────────────────────────────────────────────────────────

async def test_free_amount_link_uses_customer_amount(mock_db):
    """Con link de monto libre, public_charge usa el monto enviado por el cliente."""
    link = make_link(amount=None)
    merchant = make_merchant()
    mock_db.get.return_value = merchant
    mock_db.execute.return_value.rowcount = 1

    customer_amount = Decimal("15.00")
    txn = _make_txn(customer_amount)

    with patch(PATCH_GET_LINK, return_value=link), \
         patch(PATCH_CREATE_CHARGE, return_value=(txn, FAKE_REDIRECT)) as mock_charge:

        result = await public_charge(
            mock_db,
            token="free-token",
            amount=customer_amount,
            customer_email=None,
            customer_name="Juan Pérez",
            customer_ruc_cedula=None,
            idempotency_key="idem-key-1",
        )

    # Verifica que create_webcheckout_charge recibió el monto del cliente
    _, call_kwargs = mock_charge.call_args
    assert call_kwargs["amount"] == customer_amount

    assert result["status"] == "pending"
    assert result["amount"] == "15.00"
    assert result["redirect_url"] == FAKE_REDIRECT


async def test_free_amount_link_without_customer_amount_raises(mock_db):
    """Link de monto libre + cliente no envía monto → ValueError."""
    link = make_link(amount=None)

    with patch(PATCH_GET_LINK, return_value=link):
        with pytest.raises(ValueError, match="requiere que ingreses un monto"):
            await public_charge(
                mock_db,
                token="free-token",
                amount=None,
                customer_email=None,
                customer_name=None,
                customer_ruc_cedula=None,
                idempotency_key="idem-key-2",
            )


# ── Monto fijo ────────────────────────────────────────────────────────────────

async def test_fixed_amount_link_uses_link_amount(mock_db):
    """Con link de monto fijo, se usa link.amount aunque el cliente mande otro valor."""
    fixed = Decimal("50.00")
    link = make_link(amount=fixed)
    merchant = make_merchant()
    mock_db.get.return_value = merchant
    mock_db.execute.return_value.rowcount = 1

    txn = _make_txn(fixed)

    with patch(PATCH_GET_LINK, return_value=link), \
         patch(PATCH_CREATE_CHARGE, return_value=(txn, FAKE_REDIRECT)) as mock_charge:

        await public_charge(
            mock_db,
            token="fixed-token",
            amount=Decimal("99.00"),   # el cliente manda otro valor — debe ignorarse
            customer_email=None,
            customer_name=None,
            customer_ruc_cedula=None,
            idempotency_key="idem-key-3",
        )

    _, call_kwargs = mock_charge.call_args
    assert call_kwargs["amount"] == fixed, "Debe usar el monto del link, no el del cliente"


async def test_fixed_amount_link_success_returns_correct_fields(mock_db):
    """Link fijo exitoso retorna transaction_id, status, amount, currency, redirect_url."""
    link = make_link(amount=Decimal("30.00"))
    merchant = make_merchant()
    mock_db.get.return_value = merchant
    mock_db.execute.return_value.rowcount = 1

    txn = _make_txn(Decimal("30.00"))

    with patch(PATCH_GET_LINK, return_value=link), \
         patch(PATCH_CREATE_CHARGE, return_value=(txn, FAKE_REDIRECT)):

        result = await public_charge(
            mock_db,
            token="fixed-token",
            amount=None,
            customer_email="cliente@ejemplo.com",
            customer_name="Ana García",
            customer_ruc_cedula="1712345678",
            idempotency_key="idem-key-4",
        )

    assert result["transaction_id"] == "txn-uuid-1"
    assert result["status"] == "pending"
    assert result["amount"] == "30.00"
    assert result["currency"] == "USD"
    assert result["redirect_url"] == FAKE_REDIRECT


# ── Validaciones de estado del link ──────────────────────────────────────────

async def test_link_not_found_raises(mock_db):
    """Token que no existe → ValueError."""
    with patch(PATCH_GET_LINK, return_value=None):
        with pytest.raises(ValueError, match="no válido o inactivo"):
            await public_charge(
                mock_db,
                token="ghost-token",
                amount=Decimal("10.00"),
                customer_email=None,
                customer_name=None,
                customer_ruc_cedula=None,
                idempotency_key="idem-key-5",
            )


async def test_inactive_link_raises(mock_db):
    """Link con status != active → ValueError."""
    link = make_link(status="inactive")

    with patch(PATCH_GET_LINK, return_value=link):
        with pytest.raises(ValueError, match="no válido o inactivo"):
            await public_charge(
                mock_db,
                token="inactive-token",
                amount=Decimal("10.00"),
                customer_email=None,
                customer_name=None,
                customer_ruc_cedula=None,
                idempotency_key="idem-key-6",
            )


async def test_expired_link_raises(mock_db):
    """Link con expires_at en el pasado → ValueError."""
    expired_at = datetime.now(timezone.utc) - timedelta(hours=1)
    link = make_link(expires_at=expired_at)

    with patch(PATCH_GET_LINK, return_value=link):
        with pytest.raises(ValueError, match="expirado"):
            await public_charge(
                mock_db,
                token="expired-token",
                amount=Decimal("10.00"),
                customer_email=None,
                customer_name=None,
                customer_ruc_cedula=None,
                idempotency_key="idem-key-7",
            )


async def test_max_uses_reached_raises(mock_db):
    """Link con uses_count == max_uses → ValueError."""
    link = make_link(max_uses=5, uses_count=5)

    with patch(PATCH_GET_LINK, return_value=link):
        with pytest.raises(ValueError, match="máximo de usos"):
            await public_charge(
                mock_db,
                token="maxed-token",
                amount=Decimal("10.00"),
                customer_email=None,
                customer_name=None,
                customer_ruc_cedula=None,
                idempotency_key="idem-key-8",
            )


async def test_link_with_remaining_uses_succeeds(mock_db):
    """Link con max_uses=5 y uses_count=4 todavía tiene un uso disponible."""
    link = make_link(max_uses=5, uses_count=4, amount=Decimal("10.00"))
    merchant = make_merchant()
    mock_db.get.return_value = merchant
    mock_db.execute.return_value.rowcount = 1

    txn = _make_txn(Decimal("10.00"))

    with patch(PATCH_GET_LINK, return_value=link), \
         patch(PATCH_CREATE_CHARGE, return_value=(txn, FAKE_REDIRECT)):

        result = await public_charge(
            mock_db,
            token="almost-maxed-token",
            amount=None,
            customer_email=None,
            customer_name=None,
            customer_ruc_cedula=None,
            idempotency_key="idem-key-9",
        )

    assert result["status"] == "pending"
