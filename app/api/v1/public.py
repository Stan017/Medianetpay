"""
Endpoints públicos — sin autenticación.
GET /v1/public/vitrina/{slug} — datos de la vitrina para la página pública.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.modules.catalog import service as catalog_service
from app.schemas.catalog import PublicServiceOut, PublicVitrinaOut
from app.utils.rate_limiter import limiter

router = APIRouter(prefix="/v1/public", tags=["Público"])


@router.get("/vitrina/{slug}", response_model=PublicVitrinaOut)
@limiter.limit("60/minute")
async def get_public_vitrina(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> PublicVitrinaOut:
    data = await catalog_service.get_public_vitrina(db, slug)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "vitrina_not_found", "message": "Vitrina no encontrada o inactiva."},
        )
    return PublicVitrinaOut(
        slug=data["slug"],
        business_name=data["business_name"],
        bio=data["bio"],
        profile_image_url=data["profile_image_url"],
        services=[PublicServiceOut.model_validate(s) for s in data["services"]],
    )
