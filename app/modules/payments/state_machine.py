"""
Máquina de estados de transacciones.

Transiciones válidas:

  Flujo WebCheckout (async — MediaNet callback):
    pending    → completed | failed   (callback de MediaNet tras el pago)

  Flujo legacy / interno:
    pending    → processing           (inicio del cargo directo)
    processing → completed | failed   (resultado del cargo)

  Flujo de reversión:
    completed  → reversed
    reversed   → refunded
"""

from app.utils.logger import get_logger

logger = get_logger(__name__)

VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending":    ["processing", "completed", "failed"],  # WebCheckout llega directo de pending
    "processing": ["completed", "failed"],
    "completed":  ["reversed"],
    "reversed":   ["refunded"],
    "failed":     [],
    "refunded":   [],
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in VALID_TRANSITIONS.get(from_status, [])


def assert_transition(from_status: str, to_status: str) -> None:
    """Lanza ValueError si la transición no es válida."""
    if not can_transition(from_status, to_status):
        raise ValueError(
            f"Transición inválida: {from_status} → {to_status}. "
            f"Desde '{from_status}' solo se puede ir a: {VALID_TRANSITIONS.get(from_status, [])}"
        )
