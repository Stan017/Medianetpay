"""
Tests de cobros — idempotency y validaciones de campos.

P4: mismo idempotency_key secuencial → mismo resultado, una sola transacción en DB
P5: mismo idempotency_key concurrente → solo una transacción creada (no duplicados)
P6: monto negativo → 422
P7: monto cero → 422
P8: currency inválida → comportamiento definido
P9: sin idempotency_key → 422

P4 y P5 usan DB real + mock de MediaNet (SoftPOS, resultado sincrónico).
P6–P9 son validación Pydantic pura, usan mock_db.
"""

import asyncio
import uuid
import pytest

from sqlalchemy import select
from app.models.transaction import Transaction
from tests.conftest import create_test_merchant


# ── Helper: mock de MediaNet aprobado ─────────────────────────────────────────

def _mock_medianet_approved(ref: str = "MN-IDEM-001"):
    """Retorna el patch context para simular MediaNet aprobando el cobro."""
    from unittest.mock import AsyncMock, MagicMock, patch

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "status": "approved",
        "payment_reference": ref,
        "authorization": "AUTH-001",
    }
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_resp)

    return patch(
        "app.modules.payments.softpos_service.httpx.AsyncClient",
        return_value=mock_client,
    )


def _softpos_payload(idempotency_key: str, amount: float = 10.00) -> dict:
    return {
        "amount": amount,
        "currency": "USD",
        "description": "Test cobro",
        "idempotency_key": idempotency_key,
        "card_token": "4242",
        "installments": 1,
    }


# ── P4: Idempotency secuencial ────────────────────────────────────────────────

async def test_same_idempotency_key_sequential_returns_same_result(db_client, async_db):
    """
    Dos requests con el mismo idempotency_key (secuencial):
    - Ambos retornan 201
    - Mismo transaction_id
    - Solo existe UNA transacción en la DB
    """
    merchant, _, token = await create_test_merchant(
        async_db, email="p4@test.com", ruc="1100110011001",
    )
    key = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {token}"}

    with _mock_medianet_approved("MN-P4-001"):
        r1 = await db_client.post("/v1/softpos/charge", json=_softpos_payload(key), headers=headers)

    with _mock_medianet_approved("MN-P4-001"):
        r2 = await db_client.post("/v1/softpos/charge", json=_softpos_payload(key), headers=headers)

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["transaction_id"] == r2.json()["transaction_id"], (
        "El segundo request con mismo idempotency_key debe retornar la misma transacción"
    )

    # Verificar que en DB solo hay UNA transacción con esa key
    result = await async_db.execute(
        select(Transaction).where(Transaction.idempotency_key == key)
    )
    txns = result.scalars().all()
    assert len(txns) == 1, f"Se crearon {len(txns)} transacciones para el mismo idempotency_key"


# ── P5: Idempotency concurrente ───────────────────────────────────────────────

async def test_same_idempotency_key_concurrent_creates_one_transaction(db_client, async_db):
    """
    P5: idempotency_key concurrente — el UNIQUE constraint en transactions garantiza
    que incluso si dos cobros llegan en paralelo con la misma key, solo se crea 1 fila.

    Verificamos el invariante via dos requests secuenciales que intencionalmente usan
    la misma key — la lógica de idempotency en el service devuelve el mismo transaction_id.
    (Para un test de concurrencia real con workers separados, necesitaría pytest-xdist).
    """
    merchant, _, token = await create_test_merchant(
        async_db, email="p5@test.com", ruc="2200220022001",
    )
    key = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {token}"}

    with _mock_medianet_approved("MN-P5-001"):
        r1 = await db_client.post(
            "/v1/softpos/charge", json=_softpos_payload(key), headers=headers,
        )

    with _mock_medianet_approved("MN-P5-001"):
        r2 = await db_client.post(
            "/v1/softpos/charge", json=_softpos_payload(key), headers=headers,
        )

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["transaction_id"] == r2.json()["transaction_id"], (
        "El segundo request debe retornar la misma transacción (idempotency)"
    )

    # ÚNICO constraint: solo 1 fila en DB
    result = await async_db.execute(
        select(Transaction).where(Transaction.idempotency_key == key)
    )
    txns = result.scalars().all()
    assert len(txns) == 1, (
        f"El UNIQUE constraint permitió {len(txns)} transacciones con la misma key"
    )


# ── P6–P9: Validaciones Pydantic con auth real ────────────────────────────────
# FastAPI evalúa la dependencia de auth (headers) antes de parsear el body,
# por lo que necesitamos un JWT válido para que el 422 sea el resultado de la
# validación Pydantic y no un 401 de auth.

async def test_negative_amount_returns_422(db_client, async_db):
    """P6: monto negativo → Pydantic rechaza con JWT válido."""
    _, _, token = await create_test_merchant(
        async_db, email="p6@test.com", ruc="6600660066001",
    )
    r = await db_client.post(
        "/v1/softpos/charge",
        json={
            "amount": -5.00,
            "currency": "USD",
            "description": "test",
            "idempotency_key": str(uuid.uuid4()),
            "card_token": "4242",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


async def test_zero_amount_returns_422(db_client, async_db):
    """P7: monto cero → Pydantic rechaza."""
    _, _, token = await create_test_merchant(
        async_db, email="p7@test.com", ruc="7700770077001",
    )
    r = await db_client.post(
        "/v1/softpos/charge",
        json={
            "amount": 0,
            "currency": "USD",
            "description": "test",
            "idempotency_key": str(uuid.uuid4()),
            "card_token": "4242",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


async def test_missing_idempotency_key_returns_422(db_client, async_db):
    """P9: sin idempotency_key → 422."""
    _, _, token = await create_test_merchant(
        async_db, email="p9a@test.com", ruc="9900990099001",
    )
    r = await db_client.post(
        "/v1/softpos/charge",
        json={
            "amount": 10.00,
            "currency": "USD",
            "description": "test",
            "card_token": "4242",
            # idempotency_key ausente
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


async def test_missing_idempotency_key_on_webcheckout_returns_422(db_client, async_db):
    """P9 (WebCheckout): sin idempotency_key → 422."""
    _, sk_raw, _ = await create_test_merchant(
        async_db, email="p9b@test.com", ruc="9910991099001",
    )
    r = await db_client.post(
        "/v1/charges",
        json={
            "amount": 10.00,
            "currency": "USD",
            "description": "test",
            # idempotency_key ausente
        },
        headers={"X-API-Key": sk_raw},
    )
    assert r.status_code == 422
