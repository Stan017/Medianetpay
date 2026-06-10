import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

from app.utils.rate_limiter import limiter

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

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Cuando el frontend usa credentials: "include", el spec CORS prohibe
    # allow_origins=["*"]. En desarrollo se permite localhost:3000 explicitamente.
    _localhost_origins = [
        "http://localhost:3000", "http://127.0.0.1:3000",   # portal Next.js
        "http://localhost:3001", "http://127.0.0.1:3001",   # portal Next.js alt port
        "http://localhost:8081", "http://127.0.0.1:8081",   # Expo web
        "http://localhost:19006",                            # Expo web (legacy)
    ]
    origins = (
        _localhost_origins
        if settings.is_development
        else (
            # staging: localhost + dominios de producción (para desarrollo contra staging)
            _localhost_origins + [
                settings.portal_base_url,
                "https://medianetpay.ec",
                "https://www.medianetpay.ec",
                "https://portal.medianetpay.app",
            ]
            if settings.app_env == "staging"
            else [
                settings.portal_base_url,
                "https://medianetpay.ec",
                "https://www.medianetpay.ec",
                "https://portal.medianetpay.app",
            ]
        )
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Cookie", "X-Request-ID", "Accept"],
    )

    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: StarletteRequest, call_next) -> StarletteResponse:
            request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
            if not settings.is_development:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            return response

    app.add_middleware(SecurityHeadersMiddleware)

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
