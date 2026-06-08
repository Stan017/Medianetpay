"""
Fixtures compartidos para todos los tests de MediaNetPay.

Patrón:
  - mock_db     → AsyncMock que simula AsyncSession (sin DB real)
  - client      → httpx.AsyncClient apuntando al app con get_db sobreescrito
  - make_link   → fábrica de mocks de PaymentLink
  - make_merchant → fábrica de mocks de Merchant
"""

import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db import get_db


# ── DB mock ───────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """AsyncMock que imita AsyncSession. Cada test recibe una instancia limpia."""
    db = AsyncMock()
    # db.execute() devuelve un resultado con .all() y .scalar_one_or_none()
    db.execute.return_value.all.return_value = []
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.execute.return_value.scalars.return_value.all.return_value = []
    db.execute.return_value.rowcount = 1
    db.get.return_value = None
    return db


# ── HTTP client ───────────────────────────────────────────────────────────────

@pytest.fixture
async def client(mock_db):
    """
    Cliente HTTP que apunta al app FastAPI con get_db sobreescrito.
    No toca ninguna base de datos real.
    """
    async def _override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ── Fábricas de mocks ─────────────────────────────────────────────────────────

def make_link(
    *,
    token: str = "test-token-abc",
    amount: Decimal | None = Decimal("25.00"),
    currency: str = "USD",
    description: str = "Cobro de prueba",
    status: str = "active",
    expires_at=None,
    max_uses: int | None = None,
    uses_count: int = 0,
    merchant_id: str = "merchant-uuid-1",
    link_id: str = "link-uuid-1",
) -> MagicMock:
    """Devuelve un MagicMock con los atributos de PaymentLink."""
    link = MagicMock()
    link.id = link_id
    link.token = token
    link.amount = amount
    link.currency = currency
    link.description = description
    link.status = status
    link.expires_at = expires_at
    link.max_uses = max_uses
    link.uses_count = uses_count
    link.merchant_id = merchant_id
    return link


def make_merchant(
    *,
    merchant_id: str = "merchant-uuid-1",
    status: str = "active",
    test_mode: bool = False,
) -> MagicMock:
    """Devuelve un MagicMock con los atributos de Merchant."""
    m = MagicMock()
    m.id = merchant_id
    m.status = status
    m.test_mode = test_mode
    return m
