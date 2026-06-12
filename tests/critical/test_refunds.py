"""
Tests de reembolsos.

R1: Refund completo sobre transacción completed → refund.status=completed, txn.status=reversed
R2: Refund parcial sobre transacción completed → misma lógica, monto parcial
R3: Refund sobre transacción failed → 422
R4: Refund sobre transacción pending → 422
R5: Doble refund → segundo falla porque txn ya está en reversed
R6: Monto mayor al original → 422

Todos crean transacciones directamente en DB (sin pasar por el flujo de cobro completo).
El conector MediaNet se mockea para que el refund no intente llamar al exterior.
"""

import uuid
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.models.transaction import Transaction
from tests.conftest import create_test_merchant


# ── Helper: crea una transacción directamente en DB ───────────────────────────

async def _create_txn(db, merchant_id: str, status: str, amount: str = "100.00") -> Transaction:
    txn = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        amount=Decimal(amount),
        currency="USD",
        status=status,
        idempotency_key=str(uuid.uuid4()),
        description=f"test txn status={status}",
        medianet_ref=f"MN-{uuid.uuid4().hex[:8].upper()}",
    )
    db.add(txn)
    await db.commit()
    return txn


# ── R1: Refund completo ───────────────────────────────────────────────────────

async def test_full_refund_on_completed_transaction(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r1@test.com", ruc="1001001001002",
    )
    txn = await _create_txn(async_db, merchant.id, "completed", "100.00")

    with patch("app.modules.payments.refund_service.connector") as mock_conn:
        mock_conn.create_refund = AsyncMock(return_value={"ref": "MN-REF-001"})

        r = await db_client.post(
            "/v1/refunds",
            json={
                "transaction_id": txn.id,
                "amount": 100.00,
                "reason": "Cliente devolvió el producto",
            },
            headers={"X-API-Key": sk},
        )

    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "completed"
    assert data["transaction_id"] == txn.id
    assert Decimal(data["amount"]) == Decimal("100.00")

    # Verificar que la transacción pasó a reversed
    await async_db.refresh(txn)
    assert txn.status == "reversed", f"Transacción debería estar en 'reversed', está en '{txn.status}'"


# ── R2: Refund parcial ────────────────────────────────────────────────────────

async def test_partial_refund_on_completed_transaction(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r2@test.com", ruc="2002002002002",
    )
    txn = await _create_txn(async_db, merchant.id, "completed", "100.00")

    with patch("app.modules.payments.refund_service.connector") as mock_conn:
        mock_conn.create_refund = AsyncMock(return_value={"ref": "MN-REF-002"})

        r = await db_client.post(
            "/v1/refunds",
            json={
                "transaction_id": txn.id,
                "amount": 40.00,
                "reason": "Reembolso parcial",
            },
            headers={"X-API-Key": sk},
        )

    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "completed"
    assert Decimal(data["amount"]) == Decimal("40.00")

    await async_db.refresh(txn)
    assert txn.status == "reversed"


# ── R3: Refund sobre failed ───────────────────────────────────────────────────

async def test_refund_on_failed_transaction_returns_422(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r3@test.com", ruc="3003003003002",
    )
    txn = await _create_txn(async_db, merchant.id, "failed")

    r = await db_client.post(
        "/v1/refunds",
        json={"transaction_id": txn.id, "amount": 50.00, "reason": "test"},
        headers={"X-API-Key": sk},
    )

    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "refund_error"


# ── R4: Refund sobre pending ──────────────────────────────────────────────────

async def test_refund_on_pending_transaction_returns_422(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r4@test.com", ruc="4004004004002",
    )
    txn = await _create_txn(async_db, merchant.id, "pending")

    r = await db_client.post(
        "/v1/refunds",
        json={"transaction_id": txn.id, "amount": 50.00, "reason": "test"},
        headers={"X-API-Key": sk},
    )

    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "refund_error"


# ── R5: Doble refund ──────────────────────────────────────────────────────────

async def test_double_refund_second_fails(db_client, async_db):
    """
    Primer refund: OK (txn pasa a reversed).
    Segundo refund: falla porque txn ya no está en completed.
    """
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r5@test.com", ruc="5005005005002",
    )
    txn = await _create_txn(async_db, merchant.id, "completed", "100.00")

    with patch("app.modules.payments.refund_service.connector") as mock_conn:
        mock_conn.create_refund = AsyncMock(return_value={"ref": "MN-REF-DOUBLE"})

        r1 = await db_client.post(
            "/v1/refunds",
            json={"transaction_id": txn.id, "amount": 100.00, "reason": "Primer refund"},
            headers={"X-API-Key": sk},
        )
        r2 = await db_client.post(
            "/v1/refunds",
            json={"transaction_id": txn.id, "amount": 100.00, "reason": "Segundo refund (inválido)"},
            headers={"X-API-Key": sk},
        )

    assert r1.status_code == 201, "El primer refund debe ser exitoso"
    assert r2.status_code == 422, (
        f"El segundo refund debería fallar con 422, retornó {r2.status_code}"
    )


# ── R6: Monto mayor al original ───────────────────────────────────────────────

async def test_refund_amount_exceeds_original_returns_422(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r6@test.com", ruc="6006006006002",
    )
    txn = await _create_txn(async_db, merchant.id, "completed", "50.00")

    r = await db_client.post(
        "/v1/refunds",
        json={
            "transaction_id": txn.id,
            "amount": 99.99,  # mayor al original de $50.00
            "reason": "intento de over-refund",
        },
        headers={"X-API-Key": sk},
    )

    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "refund_error"


# ── Refund sobre transacción inexistente ──────────────────────────────────────

async def test_refund_nonexistent_transaction_returns_422(db_client, async_db):
    merchant, sk, _ = await create_test_merchant(
        async_db, email="r7@test.com", ruc="7007007007002",
    )

    r = await db_client.post(
        "/v1/refunds",
        json={
            "transaction_id": str(uuid.uuid4()),  # no existe
            "amount": 10.00,
            "reason": "test",
        },
        headers={"X-API-Key": sk},
    )

    assert r.status_code == 422
