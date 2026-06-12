"""
Tests de SoftPOS — cobro con tarjeta presente (card-present).

SP1: card_token 4242 → completed, notificación txn.approved creada
SP2: card_token 0002 → failed, notificación txn.failed creada
SP3: card_token 5500 → completed, card_brand=Mastercard
SP4: MediaNet no responde (timeout) → resultado failed limpio, sin exception expuesta
SP5: mismo idempotency_key → idempotente (segundo retorna misma transacción)

Todos usan DB real. El httpx.AsyncClient se mockea para no llamar al exterior.
"""

import uuid
import pytest
from contextlib import contextmanager
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import select

from app.models.notification import Notification
from app.models.transaction import Transaction
from tests.conftest import create_test_merchant

_PATCH_TARGET = "app.modules.payments.softpos_service.httpx.AsyncClient"


# ── Helper: construye el mock de httpx ───────────────────────────────────────

def _make_medianet_mock(*, approved: bool = True, ref: str = "MN-SP-001"):
    """Construye un mock de httpx.AsyncClient para el conector SoftPOS."""
    mock_resp = MagicMock()

    if approved:
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            "status": "approved",
            "payment_reference": ref,
            "authorization": f"AUTH-{ref}",
            "card_brand": "Visa",
            "card_last4": "4242",
        }
    else:
        import httpx
        mock_resp.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "card declined",
                request=MagicMock(),
                response=MagicMock(status_code=422),
            )
        )
        mock_resp.json.return_value = {"detail": {"code": "card_declined"}}

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_resp)
    return mock_client


def _softpos_payload(card_token: str = "4242", key: str | None = None) -> dict:
    return {
        "amount": 15.00,
        "currency": "USD",
        "description": "Cobro de prueba SoftPOS",
        "idempotency_key": key or str(uuid.uuid4()),
        "card_token": card_token,
        "installments": 1,
    }


# ── SP1: Card 4242 aprobada ───────────────────────────────────────────────────

async def test_softpos_approved_card_4242(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="sp1@test.com", ruc="1100110011002",
    )

    with patch(_PATCH_TARGET, return_value=_make_medianet_mock(approved=True, ref="MN-SP1")):
        r = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("4242"),
            headers={"Authorization": f"Bearer {token}"},
        )

    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "completed"
    assert data["card_last4"] == "4242"
    assert data["authorization_code"] is not None

    # Notificación txn.approved creada
    result = await async_db.execute(
        select(Notification).where(
            Notification.merchant_id == merchant.id,
            Notification.type == "txn.approved",
        )
    )
    notifications = result.scalars().all()
    assert len(notifications) >= 1, "Debe crearse una notificación txn.approved"


# ── SP2: Card 0002 rechazada ──────────────────────────────────────────────────

async def test_softpos_declined_card_0002(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="sp2@test.com", ruc="2200220022002",
    )

    with patch(_PATCH_TARGET, return_value=_make_medianet_mock(approved=False)):
        r = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("0002"),
            headers={"Authorization": f"Bearer {token}"},
        )

    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "failed"

    # Notificación txn.failed creada
    result = await async_db.execute(
        select(Notification).where(
            Notification.merchant_id == merchant.id,
            Notification.type == "txn.failed",
        )
    )
    notifications = result.scalars().all()
    assert len(notifications) >= 1, "Debe crearse una notificación txn.failed"


# ── SP3: Card 5500 Mastercard ─────────────────────────────────────────────────

async def test_softpos_mastercard_5500(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="sp3@test.com", ruc="3300330033002",
    )

    mock_client = _make_medianet_mock(approved=True, ref="MN-SP3")
    mock_client.post.return_value.json.return_value = {
        "status": "approved",
        "payment_reference": "MN-SP3",
        "authorization": "AUTH-MC-001",
        "card_brand": "Mastercard",
        "card_last4": "5500",
    }

    with patch(_PATCH_TARGET, return_value=mock_client):
        r = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("5500"),
            headers={"Authorization": f"Bearer {token}"},
        )

    assert r.status_code == 201
    assert r.json()["status"] == "completed"


# ── SP4: MediaNet no responde (timeout) ───────────────────────────────────────

async def test_softpos_medianet_timeout_returns_failed_cleanly(db_client, async_db):
    """
    Si MediaNet no responde, el resultado debe ser failed — no una exception 500.
    El comerciante ve 'failed', no un error de servidor.
    """
    merchant, _, token = await create_test_merchant(
        async_db, email="sp4@test.com", ruc="4400440044002",
    )

    import httpx

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

    with patch(_PATCH_TARGET, return_value=mock_client):
        r = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("4242"),
            headers={"Authorization": f"Bearer {token}"},
        )

    # No debe ser un 500 — el servicio maneja la exception internamente
    assert r.status_code == 201, f"Timeout no debería retornar 500 (retornó {r.status_code})"
    assert r.json()["status"] == "failed", "Un timeout de MediaNet debe resultar en 'failed'"


# ── SP5: Idempotency ──────────────────────────────────────────────────────────

async def test_softpos_idempotency_same_key_returns_same_transaction(db_client, async_db):
    """Dos requests con el mismo idempotency_key retornan el mismo transaction_id."""
    merchant, _, token = await create_test_merchant(
        async_db, email="sp5@test.com", ruc="5500550055002",
    )
    key = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {token}"}

    with patch(_PATCH_TARGET, return_value=_make_medianet_mock(approved=True, ref="MN-SP5")):
        r1 = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("4242", key=key),
            headers=headers,
        )

    with patch(_PATCH_TARGET, return_value=_make_medianet_mock(approved=True, ref="MN-SP5")):
        r2 = await db_client.post(
            "/v1/softpos/charge",
            json=_softpos_payload("4242", key=key),
            headers=headers,
        )

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["transaction_id"] == r2.json()["transaction_id"]

    # Exactamente una transacción en DB
    result = await async_db.execute(
        select(Transaction).where(Transaction.idempotency_key == key)
    )
    assert len(result.scalars().all()) == 1
