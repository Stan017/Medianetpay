"""
Tests unitarios para app/modules/payments/state_machine.py

Sin DB. Sin HTTP. Verifica:
  - Todas las transiciones válidas pasan
  - Todas las transiciones inválidas lanzan ValueError
  - Los estados terminales (failed, refunded) no permiten salida
  - El mensaje de error menciona el estado de origen
"""

import pytest
from app.modules.payments.state_machine import (
    VALID_TRANSITIONS,
    assert_transition,
    can_transition,
)


# ── Transiciones válidas ──────────────────────────────────────────────────────

@pytest.mark.parametrize("from_s, to_s", [
    ("pending",    "processing"),
    ("pending",    "completed"),   # WebCheckout llega directo
    ("pending",    "failed"),
    ("processing", "completed"),
    ("processing", "failed"),
    ("completed",  "reversed"),
    ("reversed",   "refunded"),
])
def test_valid_transition_passes(from_s, to_s):
    assert can_transition(from_s, to_s) is True
    assert_transition(from_s, to_s)  # no debe lanzar


# ── Transiciones inválidas ────────────────────────────────────────────────────

@pytest.mark.parametrize("from_s, to_s", [
    # Desde failed no hay salida
    ("failed",    "completed"),
    ("failed",    "processing"),
    ("failed",    "pending"),
    ("failed",    "reversed"),
    # Desde refunded no hay salida
    ("refunded",  "completed"),
    ("refunded",  "reversed"),
    ("refunded",  "pending"),
    # Saltar estados
    ("completed", "failed"),
    ("completed", "pending"),
    ("completed", "refunded"),   # debe pasar por reversed
    ("reversed",  "completed"),
    ("reversed",  "pending"),
    ("pending",   "refunded"),
    ("processing","reversed"),
])
def test_invalid_transition_raises(from_s, to_s):
    assert can_transition(from_s, to_s) is False
    with pytest.raises(ValueError):
        assert_transition(from_s, to_s)


# ── Mensaje de error ──────────────────────────────────────────────────────────

def test_error_message_includes_from_status():
    with pytest.raises(ValueError, match="failed"):
        assert_transition("failed", "completed")


def test_error_message_includes_to_status():
    with pytest.raises(ValueError, match="completed"):
        assert_transition("failed", "completed")


# ── Estado desconocido ────────────────────────────────────────────────────────

def test_unknown_from_status_returns_false():
    assert can_transition("unknown_status", "completed") is False


def test_unknown_from_status_raises():
    with pytest.raises(ValueError):
        assert_transition("unknown_status", "completed")


# ── Cobertura del mapa de transiciones ───────────────────────────────────────

def test_all_valid_transitions_are_symmetric():
    """Verifica que can_transition y VALID_TRANSITIONS estén en sync."""
    for from_s, targets in VALID_TRANSITIONS.items():
        for to_s in targets:
            assert can_transition(from_s, to_s) is True, (
                f"VALID_TRANSITIONS dice que {from_s}→{to_s} es válido "
                f"pero can_transition retorna False"
            )
