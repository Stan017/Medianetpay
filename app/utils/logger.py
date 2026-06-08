import logging
import structlog
from app.config import settings


def setup_logging() -> None:
    level = logging.DEBUG if settings.is_development else logging.INFO

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if settings.is_development
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(level=level)


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)
