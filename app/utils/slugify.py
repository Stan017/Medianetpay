"""
Genera slugs URL-seguros a partir de texto en español.
Maneja tildes, ñ, espacios, caracteres especiales y colisiones de unicidad.
"""

import re
import unicodedata
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def slugify(text: str) -> str:
    """
    'Peluquería Don José & Más!' → 'peluqueria-don-jose-mas'
    """
    # Normalizar unicode: á→a, é→e, ñ→n, ü→u, etc.
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    # Eliminar caracteres que no sean letras, números o guiones
    text = re.sub(r"[^\w\s-]", "", text)
    # Reemplazar espacios y guiones bajos por guión
    text = re.sub(r"[\s_]+", "-", text)
    # Colapsar guiones múltiples
    text = re.sub(r"-+", "-", text)
    text = text.strip("-")
    return text[:80] or "comercio"


async def generate_unique_slug(db: AsyncSession, business_name: str) -> str:
    """
    Genera un slug único para el comercio.
    Si 'peluqueria-don-jose' ya existe → 'peluqueria-don-jose-2', etc.
    """
    from app.models.merchant import Merchant

    base = slugify(business_name)
    slug = base
    counter = 2

    while True:
        existing = await db.scalar(
            select(Merchant).where(Merchant.slug == slug)
        )
        if not existing:
            return slug
        slug = f"{base}-{counter}"
        counter += 1
