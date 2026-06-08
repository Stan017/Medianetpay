"""
Corre las migraciones SQL contra la base de datos local.

Uso:
    python scripts/migrate.py

Lee DATABASE_URL del archivo .env (igual que la app).
"""

import asyncio
import os
import sys
from pathlib import Path

# Añadir raíz del proyecto al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

MIGRATIONS_DIR = Path(__file__).parent.parent / "supabase" / "migrations"


async def run_migrations():
    print(f"Conectando a: {settings.database_url[:40]}...")
    engine = create_async_engine(settings.database_url, echo=False)

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print("No hay archivos .sql en supabase/migrations/")
        return

    async with engine.begin() as conn:
        for sql_file in sql_files:
            print(f"\nEjecutando: {sql_file.name}")
            sql = sql_file.read_text(encoding="utf-8")

            # Ejecutar cada statement por separado (ignorar comentarios vacíos)
            statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
            for stmt in statements:
                try:
                    await conn.execute(text(stmt))
                    print(f"  ✓ {stmt[:60].replace(chr(10), ' ')}...")
                except Exception as e:
                    print(f"  ✗ Error: {e}")
                    raise

    await engine.dispose()
    print("\n✅ Migraciones completadas.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
