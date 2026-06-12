"""
Tests del módulo Vitrina / Catálogo.

C1: GET /v1/catalog sin auth                             → 401
C2: GET /v1/catalog autenticado                          → 200, vitrina vacía
C3: POST /v1/catalog/services crea servicio              → 201, name/price correctos
C4: GET /v1/catalog/services lista servicios             → 200, 1 servicio
C5: POST /v1/catalog/activate activa vitrina             → 200, slug generado
C6: PUT /v1/catalog/services/{id} actualiza nombre       → 200, nombre nuevo
C7: DELETE /v1/catalog/services/{id} soft delete         → 204, fuera de la lista
C8: 11.º servicio activo                                 → 422 max_services_reached
"""

import pytest

from tests.conftest import create_test_merchant


# ── C1: Sin autenticación ────────────────────────────────────────────────────

async def test_get_catalog_no_auth(db_client):
    r = await db_client.get("/v1/catalog")
    assert r.status_code == 401


# ── C2: Vitrina vacía ────────────────────────────────────────────────────────

async def test_get_catalog_empty(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c2@test.com", ruc="2200000000001")
    r = await db_client.get("/v1/catalog", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["vitrina_active"] is False
    assert body["services"] == []


# ── C3: Crear servicio ────────────────────────────────────────────────────────

async def test_create_service(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c3@test.com", ruc="2300000000001")
    r = await db_client.post(
        "/v1/catalog/services",
        data={"name": "Corte de cabello", "price": "25.00"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Corte de cabello"
    assert float(body["price"]) == 25.00
    assert body["active"] is True
    assert body["payment_link_token"] is not None


# ── C4: Listar servicios ─────────────────────────────────────────────────────

async def test_list_services(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c4@test.com", ruc="2400000000001")

    # Crear 2 servicios
    await db_client.post(
        "/v1/catalog/services",
        data={"name": "Manicure", "price": "15.00"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await db_client.post(
        "/v1/catalog/services",
        data={"name": "Pedicure", "price": "20.00"},
        headers={"Authorization": f"Bearer {token}"},
    )

    r = await db_client.get(
        "/v1/catalog/services",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    services = r.json()
    names = [s["name"] for s in services]
    assert "Manicure" in names
    assert "Pedicure" in names


# ── C5: Activar vitrina genera slug ─────────────────────────────────────────

async def test_activate_vitrina_generates_slug(db_client, async_db):
    _, _, token = await create_test_merchant(
        async_db,
        email="c5@test.com",
        ruc="2500000000001",
        business_name="Peluquería Marta",
    )

    r = await db_client.post(
        "/v1/catalog/activate",
        json={"active": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["vitrina_active"] is True
    assert body["slug"] is not None
    assert len(body["slug"]) > 0
    assert body["vitrina_url"] is not None


# ── C6: Actualizar servicio ───────────────────────────────────────────────────

async def test_update_service(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c6@test.com", ruc="2600000000001")

    create_r = await db_client.post(
        "/v1/catalog/services",
        data={"name": "Servicio viejo", "price": "10.00"},
        headers={"Authorization": f"Bearer {token}"},
    )
    service_id = create_r.json()["id"]

    update_r = await db_client.put(
        f"/v1/catalog/services/{service_id}",
        data={"name": "Servicio actualizado", "price": "12.00"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_r.status_code == 200
    body = update_r.json()
    assert body["name"] == "Servicio actualizado"
    assert float(body["price"]) == 12.00


# ── C7: Eliminar servicio (soft delete) ──────────────────────────────────────

async def test_delete_service(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c7@test.com", ruc="2700000000001")

    create_r = await db_client.post(
        "/v1/catalog/services",
        data={"name": "Servicio a eliminar", "price": "30.00"},
        headers={"Authorization": f"Bearer {token}"},
    )
    service_id = create_r.json()["id"]

    del_r = await db_client.delete(
        f"/v1/catalog/services/{service_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_r.status_code == 204

    # El servicio no aparece en la lista pública (active=False se filtra desde el cliente,
    # pero el endpoint /services devuelve todos — verificamos active=False en la DB)
    list_r = await db_client.get(
        "/v1/catalog/services",
        headers={"Authorization": f"Bearer {token}"},
    )
    services = list_r.json()
    deleted = next((s for s in services if s["id"] == service_id), None)
    # El endpoint devuelve todos los servicios del comercio (activos e inactivos)
    # — el servicio eliminado debe estar con active=False
    assert deleted is not None
    assert deleted["active"] is False


# ── C8: Límite de 10 servicios activos ──────────────────────────────────────

async def test_max_services_limit(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="c8@test.com", ruc="2800000000001")
    headers = {"Authorization": f"Bearer {token}"}

    # Crear exactamente 10 servicios activos
    for i in range(10):
        r = await db_client.post(
            "/v1/catalog/services",
            data={"name": f"Servicio {i + 1}", "price": f"{(i + 1) * 5}.00"},
            headers=headers,
        )
        assert r.status_code == 201, f"Fallo al crear el servicio {i + 1}: {r.text}"

    # El undécimo debe fallar
    r = await db_client.post(
        "/v1/catalog/services",
        data={"name": "Servicio 11", "price": "55.00"},
        headers=headers,
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "max_services_reached"
