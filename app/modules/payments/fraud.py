# -*- coding: utf-8 -*-
"""
Fraud score calculator - 100% internal, no external APIs.
Score 0-100 based on three DB factors.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction

if TYPE_CHECKING:
    pass


# ---------------------------------------------------------------------------
# Scoring weights (must sum to 100)
# ---------------------------------------------------------------------------
VELOCITY_MAX  = 40   # same email, transactions in last hour
AMOUNT_MAX    = 35   # ratio vs merchant average
HISTORY_MAX   = 25   # failed transactions with same payment method
# ---------------------------------------------------------------------------


async def _velocity_score(txn: Transaction, db: AsyncSession) -> tuple[int, dict]:
    """How many transactions from the same email in the last hour (excluding this one)?"""
    if not txn.customer_email:
        return 0, {"count": 0, "score": 0, "detail": "No email"}

    cutoff = (txn.created_at - timedelta(hours=1)) if txn.created_at else (
        datetime.now(timezone.utc) - timedelta(hours=1)
    )

    count = await db.scalar(
        select(func.count()).where(
            Transaction.customer_email == txn.customer_email,
            Transaction.created_at >= cutoff,
            Transaction.id != txn.id,
        )
    ) or 0

    # 0 -> 0, 1 -> 15, 2 -> 28, 3+ -> 40
    if count == 0:
        score = 0
    elif count == 1:
        score = 15
    elif count == 2:
        score = 28
    else:
        score = VELOCITY_MAX

    return score, {"count": int(count), "score": score}


async def _amount_score(txn: Transaction, db: AsyncSession) -> tuple[int, dict]:
    """How unusual is this amount compared to the merchant's average completed txn?"""
    avg = await db.scalar(
        select(func.avg(Transaction.amount)).where(
            Transaction.merchant_id == txn.merchant_id,
            Transaction.status == "completed",
            Transaction.id != txn.id,
        )
    )

    if not avg or float(avg) == 0:
        return 0, {"ratio": None, "avg": None, "score": 0, "detail": "No baseline"}

    ratio = float(txn.amount) / float(avg)

    if ratio > 5:
        score = 35
    elif ratio > 3:
        score = 25
    elif ratio > 2:
        score = 15
    elif ratio > 1.5:
        score = 8
    else:
        score = 0

    return score, {
        "ratio": round(ratio, 2),
        "avg_usd": round(float(avg), 2),
        "this_usd": round(float(txn.amount), 2),
        "score": score,
    }


async def _history_score(txn: Transaction, db: AsyncSession) -> tuple[int, dict]:
    """How many failed transactions used the same payment method for this merchant?"""
    if not txn.payment_method:
        return 0, {"failed": 0, "score": 0, "detail": "No payment method"}

    failed = await db.scalar(
        select(func.count()).where(
            Transaction.merchant_id == txn.merchant_id,
            Transaction.payment_method == txn.payment_method,
            Transaction.status == "failed",
            Transaction.id != txn.id,
        )
    ) or 0

    # 0 -> 0, 1 -> 10, 2 -> 18, 3+ -> 25
    if failed == 0:
        score = 0
    elif failed == 1:
        score = 10
    elif failed == 2:
        score = 18
    else:
        score = HISTORY_MAX

    return score, {"failed_count": int(failed), "score": score}


async def calculate_fraud_score(txn: Transaction, db: AsyncSession) -> dict:
    """
    Returns:
        {
          "score": int (0-100),
          "label": "Bajo Riesgo" | "Riesgo Medio" | "Alto Riesgo",
          "color": "#10b981" | "#F89937" | "#ef4444",
          "factors": {
            "velocity":  {"count": int, "score": int},
            "amount":    {"ratio": float, "avg_usd": float, "score": int},
            "history":   {"failed_count": int, "score": int},
          }
        }
    """
    v_score, v_detail = await _velocity_score(txn, db)
    a_score, a_detail = await _amount_score(txn, db)
    h_score, h_detail = await _history_score(txn, db)

    total = min(100, v_score + a_score + h_score)

    if total < 30:
        label = "Bajo Riesgo"
        color = "#10b981"
    elif total < 65:
        label = "Riesgo Medio"
        color = "#F89937"
    else:
        label = "Alto Riesgo"
        color = "#ef4444"

    return {
        "score": total,
        "label": label,
        "color": color,
        "factors": {
            "velocity": v_detail,
            "amount":   a_detail,
            "history":  h_detail,
        },
    }
