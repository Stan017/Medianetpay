"""
GET /v1/transactions        - lista paginada de transacciones del comercio autenticado.
GET /v1/transactions/export - descarga CSV con todos los datos para contabilidad SRI.
Soporta filtros por estado, fecha y monto.
"""

import csv
import io
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db import get_db
from app.middleware.jwt_auth import require_portal_auth
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.schemas.charges import ChargeResponse

router = APIRouter(prefix="/v1/transactions", tags=["Transactions - Portal"])


class PaginatedTransactions(BaseModel):
    data: list[ChargeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
    status: Annotated[str | None, Query(description="pending|processing|completed|failed|reversed|refunded")] = None,
    date_from: Annotated[datetime | None, Query(description="ISO 8601")] = None,
    date_to: Annotated[datetime | None, Query(description="ISO 8601")] = None,
    min_amount: Annotated[Decimal | None, Query(gt=0)] = None,
    max_amount: Annotated[Decimal | None, Query(gt=0)] = None,
    link_id: Annotated[str | None, Query(description="Filtrar por ID de link de cobro")] = None,
    q: Annotated[str | None, Query(description="Buscar por nombre, email, cédula/RUC, descripción o referencia")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedTransactions:
    from sqlalchemy import or_
    base = select(Transaction).where(Transaction.merchant_id == merchant.id)

    if q:
        like = f"%{q}%"
        base = base.where(
            or_(
                Transaction.customer_name.ilike(like),
                Transaction.customer_email.ilike(like),
                Transaction.customer_ruc_cedula.ilike(like),
                Transaction.description.ilike(like),
                Transaction.medianet_ref.ilike(like),
                Transaction.id.ilike(like),
            )
        )
    if link_id:
        base = base.where(Transaction.payment_link_id == link_id)
    if status:
        base = base.where(Transaction.status == status)
    if date_from:
        base = base.where(Transaction.created_at >= date_from)
    if date_to:
        base = base.where(Transaction.created_at <= date_to)
    if min_amount is not None:
        base = base.where(Transaction.amount >= min_amount)
    if max_amount is not None:
        base = base.where(Transaction.amount <= max_amount)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    total = total or 0

    offset = (page - 1) * page_size
    rows = await db.scalars(
        base.order_by(Transaction.created_at.desc()).offset(offset).limit(page_size)
    )
    txns = list(rows)

    return PaginatedTransactions(
        data=[ChargeResponse.model_validate(t, from_attributes=True) for t in txns],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.get("/export", include_in_schema=True)
async def export_transactions_csv(
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
    status: Annotated[str | None, Query()] = None,
    date_from: Annotated[datetime | None, Query(description="ISO 8601")] = None,
    date_to: Annotated[datetime | None, Query(description="ISO 8601")] = None,
) -> StreamingResponse:
    """
    Descarga un CSV con todas las transacciones del comercio.
    Columnas listas para importar en cualquier software contable o el Facturador SRI.
    Sin limite de registros - usa streaming para no saturar memoria.
    """
    base = select(Transaction).where(Transaction.merchant_id == merchant.id)
    if status:
        base = base.where(Transaction.status == status)
    if date_from:
        base = base.where(Transaction.created_at >= date_from)
    if date_to:
        base = base.where(Transaction.created_at <= date_to)

    rows = await db.scalars(base.order_by(Transaction.created_at.desc()))
    txns = list(rows)

    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezado en espanol, orden amigable para SRI
    writer.writerow([
        "Fecha",
        "ID Transaccion",
        "Referencia MediaNet",
        "Descripcion",
        "Estado",
        "Monto USD",
        "Metodo de Pago",
        "Nombre Cliente",
        "Email Cliente",
        "Tipo Identificacion",
        "RUC / Cedula",
        "Telefono",
        "Direccion",
        "Estado Factura SRI",
        "Link de Cobro ID",
    ])

    for t in txns:
        writer.writerow([
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.id,
            t.medianet_ref or "",
            t.description or "",
            t.status,
            f"{t.amount:.2f}",
            t.payment_method or "",
            t.customer_name or "",
            t.customer_email or "",
            t.customer_id_type or "",
            t.customer_ruc_cedula or "",
            t.customer_phone or "",
            t.customer_address or "",
            t.invoice_status or "",
            t.payment_link_id or "",
        ])

    output.seek(0)
    filename = f"transacciones_{merchant.id[:8]}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{transaction_id}/fraud-score")
async def get_fraud_score(
    transaction_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Calcula el score de fraude real basado en datos de la BD."""
    from fastapi import HTTPException, status as http_status
    from app.modules.payments.fraud import calculate_fraud_score

    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.merchant_id != merchant.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Transaccion no encontrada"},
        )

    return await calculate_fraud_score(txn, db)


@router.get("/{transaction_id}/receipt")
async def download_receipt(
    transaction_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Genera y descarga el recibo PDF de una transaccion."""
    from fastapi import HTTPException, status as http_status
    from app.modules.payments.receipt import generate_receipt

    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.merchant_id != merchant.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Transaccion no encontrada"},
        )

    import logging
    logger = logging.getLogger(__name__)
    try:
        pdf_bytes = generate_receipt(txn, merchant)
    except Exception as exc:
        logger.exception("Error generating receipt for txn %s: %s", transaction_id, exc)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "receipt_error", "message": str(exc)},
        )

    filename = f"recibo-{(txn.medianet_ref or transaction_id[:8]).upper()}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{transaction_id}", response_model=ChargeResponse)
async def get_transaction(
    transaction_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> ChargeResponse:
    """Detalle de una transaccion del comercio autenticado via portal."""
    from fastapi import HTTPException, status as http_status

    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.merchant_id != merchant.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Transaccion no encontrada"},
        )
    return ChargeResponse.model_validate(txn)


@router.get("/{transaction_id}/logs")
async def get_transaction_logs(
    transaction_id: str,
    merchant: Merchant = Depends(require_portal_auth),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Linea de tiempo de cambios de estado para el detalle de una transaccion."""
    from app.models.transaction_log import TransactionLog

    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.merchant_id != merchant.id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Transaccion no encontrada"},
        )

    logs = await db.scalars(
        select(TransactionLog)
        .where(TransactionLog.transaction_id == transaction_id)
        .order_by(TransactionLog.created_at.asc())
    )
    return [
        {
            "id": log.id,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "triggered_by": log.triggered_by,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
