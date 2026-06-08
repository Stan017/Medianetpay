"""
Crea un comercio de prueba en la DB local para desarrollo.

Uso:
    python scripts/create_test_merchant.py

Retorna las API keys que puedes usar en Postman o en los tests.
"""

import asyncio
import uuid
import secrets
import bcrypt
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings
from app.models.merchant import Merchant


async def main() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    pk = f"pk_test_{secrets.token_urlsafe(16)}"
    sk_raw = f"sk_test_{secrets.token_urlsafe(24)}"
    sk_hash = bcrypt.hashpw(sk_raw.encode(), bcrypt.gensalt()).decode()
    pw_hash = bcrypt.hashpw(b"test1234", bcrypt.gensalt()).decode()

    merchant = Merchant(
        id=str(uuid.uuid4()),
        business_name="Comercio de Prueba",
        ruc="1790000000001",
        email="test@medianetpay.ec",
        password_hash=pw_hash,
        api_key_public=pk,
        api_key_secret_hash=sk_hash,
        webhook_url="https://webhook.site/test",
        webhook_secret="mi-webhook-secret-de-prueba",
        status="active",
        test_mode=True,
    )

    async with SessionLocal() as db:
        db.add(merchant)
        await db.commit()

    print("\n--- Comercio de prueba creado ---")
    print(f"ID:         {merchant.id}")
    print(f"Email:      {merchant.email}")
    print(f"pk_test:    {pk}")
    print(f"sk_test:    {sk_raw}")
    print("\nUsa X-API-Key: sk_test_xxx en el header para autenticarte.")
    print("Guarda el sk en un lugar seguro — no se puede recuperar.\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
