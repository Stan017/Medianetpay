"""
Annie — Asistente virtual de MediaNetPay.

Usa Claude Haiku via Anthropic SDK con prompt caching en el system prompt.
Rate limiting en memoria (fallback cuando Redis no está disponible).
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Literal

import anthropic

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Modelo ────────────────────────────────────────────────────────────────────
MODEL = "claude-3-5-haiku-20241022"
MAX_TOKENS = 512
MAX_HISTORY_TURNS = 10   # máximo de turnos que enviamos a Claude (para no explotar el contexto)

# ── Rate limiting en memoria ──────────────────────────────────────────────────
# {ip: [timestamp_epoch, ...]}   — ventana deslizante de 1 hora
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT   = 30          # mensajes por hora por IP
RATE_WINDOW  = 3600.0      # segundos

def _check_rate_limit(ip: str) -> bool:
    """
    Retorna True si la IP puede enviar otro mensaje.
    Limpia timestamps viejos en cada llamada.
    """
    now = time.monotonic()
    cutoff = now - RATE_WINDOW
    bucket = _rate_store[ip]
    # Limpiar timestamps fuera de la ventana
    _rate_store[ip] = [t for t in bucket if t > cutoff]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        return False
    _rate_store[ip].append(now)
    return True


# ── System prompt (cacheado por Anthropic — se envía con cache_control) ───────
SYSTEM_PROMPT = """\
Eres Annie, la asistente virtual de MediaNetPay. Tu rol es ayudar a comercios, \
desarrolladores y emprendedores ecuatorianos con preguntas sobre los productos, \
servicios, precios, integraciones y procesos de MediaNetPay.

== SOBRE MEDIANETPAY ==
MediaNetPay es la pasarela de pagos líder en Ecuador, con 19 años en el mercado \
(anteriormente operaba como MediaNet). Ayudamos a comercios de todos los tamaños \
a aceptar pagos con tarjeta de crédito y débito del sistema financiero ecuatoriano.
Ecuador es un país dolarizado — todos los pagos son en USD.

== PRODUCTOS Y SERVICIOS ==

1. Checkout Web (WebCheckout)
   - Página de pago hosted y segura. El cliente es redirigido a MediaNetPay para \
completar el pago.
   - Compatible con todas las tarjetas del sistema financiero ecuatoriano: Visa, \
Mastercard, Amex.
   - Soporta pago en cuotas (diferido).
   - Integración via redirect o iframe.

2. SoftPOS — Terminal en tu celular
   - Aplicación móvil que convierte el smartphone en un terminal de cobro.
   - Tap to Pay (NFC) y QR de cobro.
   - Ideal para vendedores ambulantes, ferias, mercados, microcomercio informal.
   - No requiere hardware adicional.

3. QR de Cobro
   - El comercio genera un QR único por cada cobro.
   - El cliente escanea con su app bancaria y paga directamente.
   - Sin necesidad de tarjeta física.

4. Plugins ecommerce
   - Plugin WooCommerce para tiendas WordPress.
   - Plugin PrestaShop.
   - Instalación en minutos, sin código.

5. API REST para desarrolladores
   - Integración personalizada.
   - Documentación completa en docs.medianetpay.ec
   - Soporte de webhooks para notificaciones en tiempo real.
   - SDKs disponibles.

== BANCOS Y TARJETAS ==
Procesamos tarjetas emitidas por los principales bancos de Ecuador:
Banco Pichincha, Produbanco, Banco de Guayaquil, Banco Internacional, Banco del Austro, \
Banco del Pacífico, Banco Solidario, y más.

== PROCESO PARA EMPEZAR ==
1. Registro en medianetpay.ec (o contactar ventas para proceso empresarial)
2. Subida de documentos: RUC activo, cédula representante legal, estado de cuenta bancaria
3. Revisión por el equipo MediaNetPay (1-3 días hábiles)
4. Activación del comercio y entrega de credenciales API
5. Integración con el stack del comercio

== SEGURIDAD ==
- Plataforma certificada PCI DSS
- Encriptación 256-bit SSL/TLS
- 3D Secure (autenticación adicional para tarjetas que lo soportan)
- Monitoreo antifraude 24/7

== CONTACTO ==
- Ventas y contratar: ventas@medianetpay.ec
- Soporte técnico: soporte@medianetpay.ec
- Sitio web: medianetpay.ec

== REGLAS DE COMPORTAMIENTO ==
- Responde ÚNICAMENTE sobre temas relacionados con MediaNetPay y pagos digitales.
- Si preguntan sobre temas no relacionados (deportes, política, recetas, programación \
genérica, etc.), declina amablemente y ofrece ayuda con MediaNetPay.
- NUNCA proceses pagos reales ni solicites datos de tarjetas al usuario.
- NUNCA inventes precios o tarifas específicas; di que dependen del plan y recomienda \
contactar ventas@medianetpay.ec para un presupuesto.
- Habla en español latinoamericano, tono cercano y profesional.
- Respuestas cortas y directas: máximo 3-5 oraciones. Si la respuesta requiere más \
detalle, usa listas breves.
- Si no sabes algo con certeza, sé honesta: "No tengo ese detalle exacto, te recomiendo \
escribir a soporte@medianetpay.ec."
- Cuando alguien quiera contratar o pedir una demo, dirige siempre a ventas@medianetpay.ec.
"""


# ── Cliente Anthropic (lazy init) ─────────────────────────────────────────────
_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY no configurada")
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# ── Tipos ─────────────────────────────────────────────────────────────────────
MessageRole = Literal["user", "assistant"]

class ChatMessage:
    __slots__ = ("role", "content")
    def __init__(self, role: MessageRole, content: str) -> None:
        self.role = role
        self.content = content

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


# ── Función principal ─────────────────────────────────────────────────────────

async def annie_reply(
    user_message: str,
    history: list[dict[str, str]],
    client_ip: str,
) -> str:
    """
    Genera la respuesta de Annie al mensaje del usuario.

    Args:
        user_message: Último mensaje del usuario.
        history:      Historial previo [{role, content}, ...] sin el último mensaje.
        client_ip:    IP del cliente para rate limiting.

    Returns:
        Texto de respuesta de Annie.

    Raises:
        ValueError: Rate limit excedido.
        RuntimeError: API key no configurada.
    """
    if not _check_rate_limit(client_ip):
        raise ValueError("Has enviado demasiados mensajes. Por favor espera un momento.")

    client = _get_client()

    # Limitar historial para no exceder contexto
    trimmed = history[-(MAX_HISTORY_TURNS * 2):]  # *2 porque cada turno = 2 mensajes
    messages = [*trimmed, {"role": "user", "content": user_message}]

    logger.info("annie_chat", ip=client_ip, history_len=len(trimmed))

    response = await client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},  # prompt caching
            }
        ],
        messages=messages,
    )

    reply = response.content[0].text if response.content else ""

    logger.info(
        "annie_reply_ok",
        input_tokens=response.usage.input_tokens,
        cache_read=getattr(response.usage, "cache_read_input_tokens", 0),
        output_tokens=response.usage.output_tokens,
    )

    return reply
