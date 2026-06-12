"""
Tests de seguridad — fronteras de autenticación y autorización.

A5: JWT expirado → 401
A6: JWT de comercio A no puede ver datos de comercio B
A7: sk_ de comercio A no puede ver cobro de comercio B → 404
A8: pk_ en endpoint de escritura (refunds) → 401

Todos usan DB real (async_db + db_client).
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.transaction import Transaction
from tests.conftest import create_test_merchant


# ── A5: JWT expirado ──────────────────────────────────────────────────────────

async def test_expired_jwt_returns_401(db_client, async_db):
    merchant, _, _ = await create_test_merchant(async_db)

    expired_payload = {
        "sub": merchant.id,
        "email": merchant.email,
        "iat": datetime.now(timezone.utc) - timedelta(hours=25),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_payload, settings.secret_key, algorithm="HS256")

    r = await db_client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert r.status_code == 401


async def test_garbage_jwt_returns_401(db_client, async_db):
    r = await db_client.get(
        "/v1/auth/me",
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert r.status_code == 401


# ── A6: JWT cross-tenant ──────────────────────────────────────────────────────

async def test_merchant_a_jwt_cannot_read_merchant_b_notifications(db_client, async_db):
    """
    Merchant B tiene una notificación.
    Merchant A usa su propio JWT → GET /v1/notifications → no ve las de B.
    """
    merchant_a, _, token_a = await create_test_merchant(
        async_db, email="a6a@test.com", ruc="1001001001001",
    )
    merchant_b, _, _ = await create_test_merchant(
        async_db, email="a6b@test.com", ruc="2002002002001",
    )

    # Crear notificación directamente para merchant B
    from app.modules.notifications.service import create as create_notification
    await create_notification(
        async_db,
        merchant_id=merchant_b.id,
        type="txn.approved",
        title="Pago de B",
        body="$50 recibido",
    )

    r = await db_client.get(
        "/v1/notifications",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    assert r.status_code == 200
    data = r.json()
    # Merchant A no debe ver ninguna notificación de B
    items = data.get("items", data if isinstance(data, list) else [])
    for item in items:
        assert item.get("merchant_id") != merchant_b.id, (
            "Merchant A está viendo notificaciones de Merchant B"
        )


# ── A7: sk_ cross-tenant ──────────────────────────────────────────────────────

async def test_merchant_a_sk_cannot_read_merchant_b_charge(db_client, async_db):
    """
    Merchant B tiene una transacción en DB.
    Merchant A usa su sk_ para GET /v1/charges/{txn_id} → 404.
    """
    merchant_a, sk_a, _ = await create_test_merchant(
        async_db, email="a7a@test.com", ruc="3003003003001",
    )
    merchant_b, _, _ = await create_test_merchant(
        async_db, email="a7b@test.com", ruc="4004004004001",
    )

    # Crear transacción directamente para merchant B
    txn_b = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_b.id,
        amount=Decimal("75.00"),
        currency="USD",
        status="completed",
        idempotency_key=str(uuid.uuid4()),
        description="Cobro de B",
    )
    async_db.add(txn_b)
    await async_db.commit()

    # Merchant A intenta leer ese cobro con su propia sk_
    r = await db_client.get(
        f"/v1/charges/{txn_b.id}",
        headers={"X-API-Key": sk_a},
    )

    assert r.status_code == 404, (
        f"Merchant A pudo acceder al cobro de Merchant B (status={r.status_code})"
    )


async def test_merchant_a_sk_cannot_refund_merchant_b_transaction(db_client, async_db):
    """
    Merchant A intenta hacer refund de la transacción de Merchant B → 403.
    """
    merchant_a, sk_a, _ = await create_test_merchant(
        async_db, email="a7c@test.com", ruc="5005005005001",
    )
    merchant_b, _, _ = await create_test_merchant(
        async_db, email="a7d@test.com", ruc="6006006006001",
    )

    txn_b = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_b.id,
        amount=Decimal("100.00"),
        currency="USD",
        status="completed",
        idempotency_key=str(uuid.uuid4()),
        description="Cobro de B para refund test",
        medianet_ref="MN-B-001",
    )
    async_db.add(txn_b)
    await async_db.commit()

    r = await db_client.post(
        "/v1/refunds",
        json={
            "transaction_id": txn_b.id,
            "amount": 50.00,
            "reason": "intento de fraude cross-tenant",
        },
        headers={"X-API-Key": sk_a},
    )

    assert r.status_code == 403, (
        f"Merchant A pudo iniciar refund en transacción de Merchant B (status={r.status_code})"
    )


# ── A8: pk_ en endpoint de escritura ─────────────────────────────────────────

async def test_pk_cannot_create_refund(db_client, async_db):
    """pk_ (clave pública) no puede usarse para crear reembolsos."""
    merchant, _, _ = await create_test_merchant(
        async_db, email="a8a@test.com", ruc="7007007007001",
    )

    r = await db_client.post(
        "/v1/refunds",
        json={
            "transaction_id": str(uuid.uuid4()),
            "amount": 10.00,
            "reason": "test",
        },
        headers={"X-API-Key": merchant.api_key_public},
    )

    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "public_key_not_allowed"


async def test_pk_cannot_create_charge(db_client, async_db):
    """pk_ no puede crear cobros WebCheckout."""
    merchant, _, _ = await create_test_merchant(
        async_db, email="a8b@test.com", ruc="8008008008001",
    )

    r = await db_client.post(
        "/v1/charges",
        json={
            "amount": 10.00,
            "currency": "USD",
            "description": "test",
            "idempotency_key": str(uuid.uuid4()),
        },
        headers={"X-API-Key": merchant.api_key_public},
    )

    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "public_key_not_allowed"
