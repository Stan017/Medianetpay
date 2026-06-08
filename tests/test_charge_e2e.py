"""
Test end-to-end de cobro contra el mock server de MediaNet.

Para correr:
  1. Levantar el mock: python -m mock_medianet.server
  2. En otra terminal: pytest tests/test_charge_e2e.py -v
"""

import uuid
import pytest
import pytest_asyncio
import httpx


MOCK_URL = "http://localhost:9000"
API_URL  = "http://localhost:8000"


@pytest.mark.asyncio
async def test_mock_health():
    """El mock server responde correctamente."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{MOCK_URL}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_cobro_exitoso():
    """Cobro básico con tarjeta de prueba exitosa."""
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{MOCK_URL}/api/v1/charges", json={
            "amount": "50.00",
            "currency": "USD",
            "idempotency_key": str(uuid.uuid4()),
            "description": "Test cobro exitoso",
            "installments": 1,
            "card_token": "4242424242424242",
        })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "completed"
    assert data["ref"].startswith("MN-")
    assert data["amount"] == "50.00"


@pytest.mark.asyncio
async def test_cobro_declinado():
    """Tarjeta declinada retorna 422."""
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{MOCK_URL}/api/v1/charges", json={
            "amount": "25.00",
            "currency": "USD",
            "idempotency_key": str(uuid.uuid4()),
            "description": "Test declinado",
            "card_token": "4000000000000002",
        })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "card_declined"


@pytest.mark.asyncio
async def test_idempotencia():
    """El mismo idempotency_key retorna el mismo cobro."""
    key = str(uuid.uuid4())
    payload = {
        "amount": "100.00",
        "currency": "USD",
        "idempotency_key": key,
        "description": "Test idempotencia",
        "card_token": "4242424242424242",
    }
    async with httpx.AsyncClient() as client:
        r1 = await client.post(f"{MOCK_URL}/api/v1/charges", json=payload)
        r2 = await client.post(f"{MOCK_URL}/api/v1/charges", json=payload)

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["ref"] == r2.json()["ref"]


@pytest.mark.asyncio
async def test_consulta_cobro():
    """Consultar un cobro por ref retorna los datos correctos."""
    key = str(uuid.uuid4())
    async with httpx.AsyncClient() as client:
        r1 = await client.post(f"{MOCK_URL}/api/v1/charges", json={
            "amount": "75.00",
            "currency": "USD",
            "idempotency_key": key,
            "description": "Test consulta",
            "card_token": "4242424242424242",
        })
        ref = r1.json()["ref"]
        r2 = await client.get(f"{MOCK_URL}/api/v1/charges/{ref}")

    assert r2.status_code == 200
    assert r2.json()["ref"] == ref
    assert r2.json()["amount"] == "75.00"


@pytest.mark.asyncio
async def test_reembolso():
    """Reembolso de un cobro exitoso."""
    key = str(uuid.uuid4())
    async with httpx.AsyncClient() as client:
        r1 = await client.post(f"{MOCK_URL}/api/v1/charges", json={
            "amount": "200.00",
            "currency": "USD",
            "idempotency_key": key,
            "description": "Test reembolso",
            "card_token": "4242424242424242",
        })
        ref = r1.json()["ref"]

        r2 = await client.post(f"{MOCK_URL}/api/v1/refunds", json={
            "charge_ref": ref,
            "amount": "50.00",
            "reason": "Cliente devolvió el producto",
        })

    assert r2.status_code == 200
    data = r2.json()
    assert data["status"] == "completed"
    assert data["charge_ref"] == ref
    assert data["amount"] == "50.00"


@pytest.mark.asyncio
async def test_cobro_cuotas():
    """Cobro con diferidos (6 cuotas)."""
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{MOCK_URL}/api/v1/charges", json={
            "amount": "600.00",
            "currency": "USD",
            "idempotency_key": str(uuid.uuid4()),
            "description": "Laptop 6 cuotas",
            "installments": 6,
            "card_token": "4242424242424242",
        })
    assert r.status_code == 200
    data = r.json()
    assert data["installments"] == 6
    assert data["payment_method"] == "installments"


@pytest.mark.asyncio
async def test_api_health():
    """El API principal responde correctamente."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{API_URL}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
