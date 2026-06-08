class MediaNetError(Exception):
    """Base para todos los errores del conector."""
    def __init__(self, message: str, status_code: int | None = None, raw: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw = raw or {}


class MediaNetConnectionError(MediaNetError):
    """No se pudo conectar al API de MediaNet (timeout, red caída)."""


class MediaNetAuthError(MediaNetError):
    """Credenciales inválidas."""


class MediaNetDeclinedError(MediaNetError):
    """El cobro fue declinado por el banco o el procesador."""


class MediaNetDuplicateError(MediaNetError):
    """Idempotency key ya usada — el cobro ya existe."""


class CircuitOpenError(MediaNetError):
    """Circuit breaker abierto — MediaNet está fallando, no enviamos más requests."""
