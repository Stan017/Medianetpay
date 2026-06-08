from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.utils.logger import get_logger, setup_logging
from fastapi.staticfiles import StaticFiles
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.charges import router as charges_router
from app.api.v1.refunds import router as refunds_router
from app.api.v1.links import router as links_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.checkout import router as checkout_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.softpos import router as softpos_router
from app.api.v1.chat import router as chat_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.public import router as public_router
from app.modules.connector.client import connector

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("MediaNetPay arrancando", env=settings.app_env)
    logger.info("Conector apuntando a", url=settings.medianet_api_url)
    yield
    await connector.close()
    logger.info("MediaNetPay apagado")


def create_app() -> FastAPI:
    app = FastAPI(
        title="MediaNetPay API",
        description="Pasarela de pagos ecommerce para Ecuador",
        version="0.1.0",
        docs_url="/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    # Cuando el frontend usa credentials: "include", el spec CORS prohibe
    # allow_origins=["*"]. En desarrollo se permite localhost:3000 explicitamente.
    origins = (
        [
            "http://localhost:3000", "http://127.0.0.1:3000",   # portal Next.js
            "http://localhost:3001", "http://127.0.0.1:3001",   # portal Next.js MediaNetPay
            "http://localhost:8081", "http://127.0.0.1:8081",   # Expo web
            "http://localhost:19006",                            # Expo web (legacy)
        ]
        if settings.is_development
        else [
            settings.api_base_url,
            "https://medianetpay.ec",
            "https://www.medianetpay.ec",
        ]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(charges_router)
    app.include_router(refunds_router)
    app.include_router(links_router)
    app.include_router(webhooks_router)
    app.include_router(transactions_router)
    app.include_router(checkout_router)
    app.include_router(analytics_router)
    app.include_router(softpos_router)
    app.include_router(chat_router)
    app.include_router(notifications_router)
    app.include_router(catalog_router)
    app.include_router(public_router)

    import os
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    return app


app = create_app()
