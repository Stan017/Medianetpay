"""
Analytics del portal — métricas para el comerciante.

GET /v1/analytics/summary  — totales y conteos para el dashboard.
GET /v1/analytics/hourly   — volumen agrupado por hora del día (pico de cobros).
GET /v1/analytics/weekly   — volumen agrupado por día de la semana.
GET /v1/analytics/customers — clientes frecuentes (2+ pagos).
"""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.models.transaction import Transaction

_DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"])


class AnalyticsSummary(BaseModel):
    total_transactions: int
    completed_count: int
    failed_count: int
    pending_count: int
    reversed_count: int
    total_amount_completed: str   # USD, 2 decimales
    currency: str = "USD"
    date_from: str | None
    date_to: str | None


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
    date_from: Annotated[datetime | None, Query(description="ISO 8601 — inicio del rango")] = None,
    date_to: Annotated[datetime | None, Query(description="ISO 8601 — fin del rango")] = None,
) -> AnalyticsSummary:
    """
    Resumen estadístico de transacciones del comercio.
    Un solo query con aggregates — sin paginación, sin límite de 100 registros.
    """
    base_filter = [Transaction.merchant_id == merchant.id]
    if date_from:
        base_filter.append(Transaction.created_at >= date_from)
    if date_to:
        base_filter.append(Transaction.created_at <= date_to)

    # ── Un solo query con COUNT por status y SUM de completadas ──────────────
    total_count = await db.scalar(
        select(func.count(Transaction.id)).where(*base_filter)
    ) or 0

    completed_count = await db.scalar(
        select(func.count(Transaction.id)).where(
            *base_filter, Transaction.status == "completed"
        )
    ) or 0

    failed_count = await db.scalar(
        select(func.count(Transaction.id)).where(
            *base_filter, Transaction.status == "failed"
        )
    ) or 0

    pending_count = await db.scalar(
        select(func.count(Transaction.id)).where(
            *base_filter, Transaction.status.in_(["pending", "processing"])
        )
    ) or 0

    reversed_count = await db.scalar(
        select(func.count(Transaction.id)).where(
            *base_filter, Transaction.status.in_(["reversed", "refunded"])
        )
    ) or 0

    total_amount = await db.scalar(
        select(func.sum(Transaction.amount)).where(
            *base_filter, Transaction.status == "completed"
        )
    ) or Decimal("0.00")

    return AnalyticsSummary(
        total_transactions=total_count,
        completed_count=completed_count,
        failed_count=failed_count,
        pending_count=pending_count,
        reversed_count=reversed_count,
        total_amount_completed=f"{total_amount:.2f}",
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
    )


# ── Hourly ────────────────────────────────────────────────────────────────────

class HourlyBucket(BaseModel):
    hour: int
    label: str        # "08:00"
    cobros: int
    total: str        # USD con 2 decimales


class HourlyAnalytics(BaseModel):
    data: list[HourlyBucket]
    peak_hour: int | None
    peak_label: str | None
    peak_total: str


@router.get("/hourly", response_model=HourlyAnalytics)
async def get_hourly(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
    date_from: Annotated[datetime | None, Query(description="ISO 8601")] = None,
    date_to: Annotated[datetime | None, Query(description="ISO 8601")] = None,
) -> HourlyAnalytics:
    """Volumen de cobros agrupado por hora del día (0-23). Útil para detectar picos."""
    hora_col = extract("hour", Transaction.created_at)
    filters = [Transaction.merchant_id == merchant.id, Transaction.status == "completed"]
    if date_from:
        filters.append(Transaction.created_at >= date_from)
    if date_to:
        filters.append(Transaction.created_at <= date_to)

    result = await db.execute(
        select(
            hora_col.label("hora"),
            func.count(Transaction.id).label("cobros"),
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("total"),
        )
        .where(*filters)
        .group_by(hora_col)
        .order_by(hora_col)
    )
    rows = result.all()

    buckets = [
        HourlyBucket(
            hour=int(row.hora),
            label=f"{int(row.hora):02d}:00",
            cobros=row.cobros,
            total=f"{row.total:.2f}",
        )
        for row in rows
    ]
    peak = max(buckets, key=lambda b: float(b.total)) if buckets else None
    return HourlyAnalytics(
        data=buckets,
        peak_hour=peak.hour if peak else None,
        peak_label=peak.label if peak else None,
        peak_total=peak.total if peak else "0.00",
    )


# ── Weekly ────────────────────────────────────────────────────────────────────

class WeeklyBucket(BaseModel):
    dow: int          # 0=domingo … 6=sábado (PostgreSQL extract dow)
    label: str        # "Viernes"
    cobros: int
    total: str


class WeeklyAnalytics(BaseModel):
    data: list[WeeklyBucket]
    best_day: str | None
    best_total: str


@router.get("/weekly", response_model=WeeklyAnalytics)
async def get_weekly(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
    date_from: Annotated[datetime | None, Query(description="ISO 8601")] = None,
    date_to: Annotated[datetime | None, Query(description="ISO 8601")] = None,
) -> WeeklyAnalytics:
    """Volumen de cobros agrupado por día de la semana. Detecta el mejor día del comercio."""
    dow_col = extract("dow", Transaction.created_at)  # 0=domingo en PostgreSQL
    filters = [Transaction.merchant_id == merchant.id, Transaction.status == "completed"]
    if date_from:
        filters.append(Transaction.created_at >= date_from)
    if date_to:
        filters.append(Transaction.created_at <= date_to)

    result = await db.execute(
        select(
            dow_col.label("dow"),
            func.count(Transaction.id).label("cobros"),
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("total"),
        )
        .where(*filters)
        .group_by(dow_col)
        .order_by(dow_col)
    )
    rows = result.all()

    buckets = [
        WeeklyBucket(
            dow=int(row.dow),
            label=_DAYS_ES[int(row.dow)],
            cobros=row.cobros,
            total=f"{row.total:.2f}",
        )
        for row in rows
    ]
    best = max(buckets, key=lambda b: float(b.total)) if buckets else None
    return WeeklyAnalytics(
        data=buckets,
        best_day=best.label if best else None,
        best_total=best.total if best else "0.00",
    )


# ── Frequent customers ────────────────────────────────────────────────────────

class FrequentCustomer(BaseModel):
    ruc_cedula: str
    name: str | None
    veces: int
    total_pagado: str
    ultimo_pago: str   # ISO 8601


class CustomersAnalytics(BaseModel):
    data: list[FrequentCustomer]
    total_repeat: int


@router.get("/customers", response_model=CustomersAnalytics)
async def get_customers(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> CustomersAnalytics:
    """Clientes que han pagado 2 o más veces. Ordenados por frecuencia descendente."""
    result = await db.execute(
        select(
            Transaction.customer_ruc_cedula,
            Transaction.customer_name,
            func.count(Transaction.id).label("veces"),
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("total"),
            func.max(Transaction.created_at).label("ultimo"),
        )
        .where(
            Transaction.merchant_id == merchant.id,
            Transaction.status == "completed",
            Transaction.customer_ruc_cedula.isnot(None),
        )
        .group_by(Transaction.customer_ruc_cedula, Transaction.customer_name)
        .having(func.count(Transaction.id) >= 2)
        .order_by(func.count(Transaction.id).desc())
        .limit(20)
    )
    rows = result.all()

    customers = [
        FrequentCustomer(
            ruc_cedula=row.customer_ruc_cedula,
            name=row.customer_name,
            veces=row.veces,
            total_pagado=f"{row.total:.2f}",
            ultimo_pago=row.ultimo.isoformat(),
        )
        for row in rows
    ]
    return CustomersAnalytics(data=customers, total_repeat=len(customers))
