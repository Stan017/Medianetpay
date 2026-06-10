"""
POST /v1/chat  — Endpoint público del chatbot Annie.

No requiere autenticación. Rate limit: 30 mensajes/hora por IP.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.modules.ai.chatbot import annie_reply
from app.utils.logger import get_logger
from app.utils.rate_limiter import limiter

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/chat", tags=["chatbot"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    role: str    # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: Annotated[str, Field(min_length=1, max_length=2000)]
    history: list[HistoryItem] = Field(default_factory=list, max_length=40)


class ChatResponse(BaseModel):
    reply: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
@limiter.limit("30/hour")
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
) -> ChatResponse:
    """
    Envía un mensaje a Annie y recibe la respuesta.

    - `message`: el último mensaje del usuario
    - `history`: historial de la conversación (sin incluir el mensaje actual)
    """
    history = [h.model_dump() for h in body.history]

    try:
        reply = await annie_reply(
            user_message=body.message,
            history=history,
        )
    except RuntimeError as e:
        # API key no configurada u otro error de configuración
        logger.error("annie_config_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El asistente no está disponible en este momento.",
        )
    except Exception as e:
        logger.error("annie_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pude procesar tu mensaje. Por favor intenta de nuevo.",
        )

    return ChatResponse(reply=reply)
