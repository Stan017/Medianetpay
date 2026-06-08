"""
Crea todas las tablas en Supabase desde los modelos SQLAlchemy.

Uso:
    python scripts/setup_db.py

Usa DATABASE_URL del .env. Seguro de correr múltiples veces (CREATE IF NOT EXISTS).
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.models.base import Base

# Importar todos los modelos para que Base los registre
import app.models.merchant          # noqa: F401
import app.models.transaction        # noqa: F401
import app.models.payment_link       # noqa: F401
import app.models.transaction_log    # noqa: F401


async def setup():
    print(f"Conectando a Supabase...")
    engine = create_async_engine(settings.database_url, echo=False)

    async with engine.begin() as conn:
        print("Creando tablas...")
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("\n✅ Tablas creadas exitosamente:")
    for table in Base.metadata.sorted_tables:
        print(f"   • {table.name}")


if __name__ == "__main__":
    asyncio.run(setup())
