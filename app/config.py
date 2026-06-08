from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    api_base_url: str = "https://medianetpay.ec"
    # URL pública del portal Next.js — usada para generar el link de vitrina.
    # En dev: http://192.168.1.6:3000 (accesible desde celular y PC en la misma red).
    # En prod: https://medianetpay.ec
    portal_base_url: str = "https://medianetpay.ec"

    # Base de datos
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/medianetpay"

    # Redis — opcional para beta/producción inicial.
    # Si no se configura, el rate limiting usa memoria en proceso (chatbot.py).
    # Para activar Celery workers en el futuro, configurar con URL de Upstash Redis.
    redis_url: str | None = None

    # Conector MediaNet (WebCheckout)
    medianet_api_url: str = "http://localhost:9000"
    medianet_api_key: str = "test-key"           # key_webservice en el API real
    medianet_api_username: str = "test_merchant"  # username en el API real
    medianet_api_secret: str = "test-secret"      # solo para firmar webhooks salientes
    medianet_timeout_seconds: int = 15
    medianet_max_retries: int = 2

    # Google OAuth (para login desde app móvil)
    google_client_id: str = ""   # WEB client ID de Google Cloud Console

    # Anthropic
    anthropic_api_key: str = ""

    # Sentry
    sentry_dsn: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


_PROD_DEFAULTS_FORBIDDEN: list[tuple[str, str]] = [
    ("secret_key", "change-me-in-production"),
    ("medianet_api_url", "http://localhost:9000"),
    ("database_url", "postgresql+asyncpg://postgres:password@localhost:5432/medianetpay"),
    ("medianet_api_key", "test-key"),
]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production:
        for attr, bad_default in _PROD_DEFAULTS_FORBIDDEN:
            if getattr(s, attr) == bad_default:
                raise RuntimeError(
                    f"{attr.upper()} todavía tiene el valor por defecto de desarrollo. "
                    f"Configura la variable de entorno antes de correr en producción."
                )
    return s


settings = get_settings()
