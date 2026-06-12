"""
Tests del módulo de Notificaciones.

N1: GET /v1/notifications sin auth               → 401
N2: GET /v1/notifications autenticado, vacío     → 200, items=[], unread_count=0
N3: GET /v1/notifications con notificaciones     → 200, unread_count correcto
N4: POST /v1/notifications/{id}/read             → 204, queda read=True
N5: POST /v1/notifications/{id}/read otro comercio → 404
N6: POST /v1/notifications/read-all             → 204, todas leídas
"""

import pytest

from app.modules.notifications import service as notification_service
from tests.conftest import create_test_merchant


# ── N1: Sin autenticación ────────────────────────────────────────────────────

async def test_list_notifications_no_auth(db_client):
    r = await db_client.get("/v1/notifications")
    assert r.status_code == 401


# ── N2: Lista vacía ──────────────────────────────────────────────────────────

async def test_list_notifications_empty(db_client, async_db):
    _, _, token = await create_test_merchant(async_db, email="n2@test.com", ruc="0200000000001")
    r = await db_client.get("/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["items"] == []
    assert body["unread_count"] == 0


# ── N3: Lista con notificaciones, unread_count correcto ──────────────────────

async def test_list_notifications_with_data(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="n3@test.com", ruc="0300000000001"
    )

    # Una notificación leída, una sin leer
    await notification_service.create(
        async_db,
        merchant_id=merchant.id,
        type="txn.approved",
        title="Pago aprobado",
        body="$10.00 recibido",
    )
    await notification_service.create(
        async_db,
        merchant_id=merchant.id,
        type="txn.failed",
        title="Pago rechazado",
        body="Tarjeta declinada",
    )
    await async_db.commit()

    # Marcar la primera como leída
    notifs = await notification_service.list_for_merchant(async_db, merchant.id)
    await notification_service.mark_read(async_db, notifs[-1].id, merchant.id)
    await async_db.commit()

    r = await db_client.get("/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 2
    assert body["unread_count"] == 1


# ── N4: Marcar una notificación como leída ───────────────────────────────────

async def test_mark_notification_read(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="n4@test.com", ruc="0400000000001"
    )
    notif = await notification_service.create(
        async_db,
        merchant_id=merchant.id,
        type="txn.approved",
        title="Pago aprobado",
        body="$25.00 recibido",
    )
    await async_db.commit()

    r = await db_client.post(
        f"/v1/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 204

    # Verificar en DB que quedó leída
    await async_db.refresh(notif)
    assert notif.read is True


# ── N5: Marcar notificación de otro comercio → 404 ───────────────────────────

async def test_mark_read_wrong_merchant_returns_404(db_client, async_db):
    # Comercio A dueño de la notificación
    merchant_a, _, _ = await create_test_merchant(
        async_db, email="n5a@test.com", ruc="0500000000001"
    )
    notif = await notification_service.create(
        async_db,
        merchant_id=merchant_a.id,
        type="txn.approved",
        title="Pago aprobado",
        body="$5.00 recibido",
    )
    await async_db.commit()

    # Comercio B intenta marcarla como leída
    _, _, token_b = await create_test_merchant(
        async_db, email="n5b@test.com", ruc="0500000000002"
    )

    r = await db_client.post(
        f"/v1/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "not_found"


# ── N6: Marcar todas como leídas ─────────────────────────────────────────────

async def test_mark_all_read(db_client, async_db):
    merchant, _, token = await create_test_merchant(
        async_db, email="n6@test.com", ruc="0600000000001"
    )

    # 3 notificaciones sin leer
    for i in range(3):
        await notification_service.create(
            async_db,
            merchant_id=merchant.id,
            type="txn.approved",
            title=f"Notificación {i + 1}",
            body="test",
        )
    await async_db.commit()

    r = await db_client.post(
        "/v1/notifications/read-all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 204

    # Verificar que todas quedaron leídas
    notifs = await notification_service.list_for_merchant(async_db, merchant.id)
    assert all(n.read for n in notifs)
