from slowapi import Limiter
from starlette.requests import Request


def _client_ip(request: Request) -> str:
    """
    Extrae la IP del cliente respetando X-Forwarded-For de Cloud Run.
    Usa el primer valor del header (IP original del cliente).
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_client_ip)
