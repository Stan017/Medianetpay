"""
Fixtures compartidos para todos los tests de MediaNetPay.

Mock DB (rápido, para lógica pura):
  - mock_db     → AsyncMock que simula AsyncSession
  - client      → httpx.AsyncClient con get_db sobreescrito (mock)

Real DB (tests críticos — idempotency, security, state machine):
  - test_engine → motor SQLAlchemy apuntando a medianetpay_test (scope=session)
  - async_db    → sesión real con truncate después de cada test
  - db_client   → httpx.AsyncClient con DB real

Prerequisito para real DB:
  psql -U postgres -c "CREATE DATABASE medianetpay_test;"
  O con variable de entorno: TEST_DATABASE_URL=postgresql+asyncpg://...

Helpers:
  - create_test_merchant(db, **kwargs) → (merchant, sk_raw, jwt_token)
  - make_link(**kwargs)    → MagicMock de PaymentLink
  - make_merchant(**kwargs) → MagicMock de Merchant
"""

import os
import pytest
import pytest_asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.db import get_db
from app.models.base import Base

# Importar todos los modelos para que Base.metadata los registre
from app.models.merchant import Merchant          # noqa: F401
from app.models.transaction import Transaction    # noqa: F401
from app.models.transaction_log import TransactionLog  # noqa: F401
from app.models.payment_link import PaymentLink   # noqa: F401
from app.models.refund import Refund              # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.catalog_service import CatalogService  # noqa: F401

from app.config import settings as _settings

# Por defecto usa la misma DB que la app pero en un schema separado (test_env).
# Las tablas de producción viven en 'public', las de test en 'test_env'.
# Nunca se mezclan ni se borran datos reales.
_TEST_DB_URL    = os.getenv("TEST_DATABASE_URL", _settings.database_url)
_TEST_SCHEMA    = os.getenv("TEST_SCHEMA", "test_env")

_connect_args: dict = {}
if "supabase.co" in _TEST_DB_URL:
    _connect_args["ssl"] = "require"
_connect_args["server_settings"] = {"search_path": _TEST_SCHEMA}


# ══════════════════════════════════════════════════════════════════════════════
# MOCK DB — para tests de lógica pura sin base de datos
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_db():
    """AsyncMock que imita AsyncSession. Cada test recibe una instancia limpia."""
    db = AsyncMock()
    db.execute.return_value.all.return_value = []
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.execute.return_value.scalars.return_value.all.return_value = []
    db.execute.return_value.rowcount = 1
    db.get.return_value = None
    return db


@pytest_asyncio.fixture
async def client(mock_db):
    """Cliente HTTP con get_db sobreescrito (sin DB real)."""
    async def _override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════════════════
# REAL DB — para tests críticos
# ══════════════════════════════════════════════════════════════════════════════

@pytest_asyncio.fixture
async def async_db():
    """
    Sesión real de PostgreSQL — un engine fresco por test.
    Crea el schema test_env si no existe, luego trunca después del test.
    Usar un engine por test evita conflictos de event loop con asyncpg.
    """
    engine = create_async_engine(_TEST_DB_URL, echo=False, connect_args=_connect_args)
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{_TEST_SCHEMA}"'))
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        try:
            await session.execute(text("TRUNCATE TABLE merchants CASCADE"))
            await session.commit()
        except Exception:
            pass
    await engine.dispose()


@pytest_asyncio.fixture
async def db_client(async_db):
    """Cliente HTTP que usa la sesión real de PostgreSQL."""
    async def _override():
        yield async_db

    app.dependency_overrides[get_db] = _override
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def create_test_merchant(
    db: AsyncSession,
    *,
    email: str = "test@example.com",
    ruc: str = "1234567890001",
    business_name: str = "Test Business",
    password: str = "testpass123",
) -> tuple:
    """
    Crea un comercio real en la test DB.
    Retorna (merchant, sk_raw, jwt_token).
    """
    from app.modules.auth.service import register as _register
    return await _register(
        db,
        business_name=business_name,
        ruc=ruc,
        email=email,
        password=password,
    )


# ══════════════════════════════════════════════════════════════════════════════
# FÁBRICAS DE MOCKS — usadas por tests de checkout existentes
# ══════════════════════════════════════════════════════════════════════════════

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
