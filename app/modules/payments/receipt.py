# -*- coding: utf-8 -*-
"""
Generador de recibos PDF para transacciones MediaNetPay.
Usa fpdf2 - sin dependencias de sistema.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import TYPE_CHECKING

from pathlib import Path
from fpdf import FPDF

ASSETS = Path(__file__).parent / "assets"

if TYPE_CHECKING:
    from app.models.transaction import Transaction
    from app.models.merchant import Merchant

# -- Colores ------------------------------------------------------------------
NAVY   = (0,   51,  88)
ORANGE = (248, 153, 55)
GRAY   = (110, 110, 125)
LGRAY  = (235, 237, 242)
LLGRAY = (248, 249, 252)
BLACK  = (20,  20,  30)
WHITE  = (255, 255, 255)
GREEN  = (16,  185, 129)
RED    = (239, 68,  68)

IVA_RATE = Decimal("0.15")  # Ecuador 2024


def _safe(text: str) -> str:
    # Sanitize text for latin-1 (Helvetica in fpdf2).
    replacements = {
        '\u2014': '-', '\u2013': '-',
        '\u2018': chr(39), '\u2019': chr(39),
        '\u201c': chr(34), '\u201d': chr(34),
        '\xe9': 'e', '\xf3': 'o', '\xed': 'i',
        '\xfa': 'u', '\xe1': 'a', '\xf1': 'n',
        '\xe0': 'a', '\xe8': 'e', '\xf2': 'o',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode('latin-1', errors='replace').decode('latin-1')

def _fmt_dt(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso) if isinstance(iso, str) else iso
        meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
        return f"{dt.day} {meses[dt.month-1]} {dt.year}, {dt.strftime('%H:%M')}"
    except Exception:
        return str(iso)


def _calc_iva(total: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """Retorna (subtotal, iva, total). El total ya incluye IVA."""
    subtotal = (total / (1 + IVA_RATE)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    iva = (total - subtotal).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return subtotal, iva, total


def _card_display(payment_method: str | None, metadata: dict) -> str:
    """Construye 'VISA **** 4242' a partir del metodo y metadata."""
    brand = (payment_method or "Tarjeta").upper()
    last4 = metadata.get("card_last4") or metadata.get("last4") or metadata.get("card_token", "")
    if last4:
        last4 = str(last4)[-4:]
        return f"{brand} **** {last4}"
    return brand


# -- Clase PDF -----------------------------------------------------------------

class ReceiptPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=False)
        self.add_page()
        self.set_margins(0, 0, 0)

    # -- Header ---------------------------------------------------------------
    def header_block(self, merchant_name: str, merchant_ruc: str,
                     merchant_email: str, receipt_num: str):
        # Franja navy
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 42, "F")

        # Columna izquierda - comercio
        self.set_xy(14, 8)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(110, 7, _safe(merchant_name[:38]))

        self.set_xy(14, 17)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(170, 200, 220)
        self.cell(110, 4, _safe(f"RUC: {merchant_ruc}"))

        self.set_xy(14, 22)
        self.cell(110, 4, _safe(merchant_email or ""))

        # Columna derecha - logo + No recibo
        logo_path = str(ASSETS / "logo_white.png")
        # Logo blanco: ancho 52mm proporcional (274x55 -> 52x10.4)
        self.image(logo_path, x=142, y=8, w=52)

        self.set_xy(142, 21)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(170, 200, 220)
        self.cell(54, 4, f"Recibo N  {_safe(receipt_num)}", align="C")

        self.set_xy(142, 26)
        self.cell(54, 4, "pasarela.medianetpay.ec", align="C")

    # -- Bloque monto + estado ------------------------------------------------
    def amount_block(self, txn_ref: str, status: str,
                     subtotal: Decimal, iva: Decimal, total: Decimal,
                     created_at):
        y = 50

        # Monto total grande
        self.set_xy(14, y)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(*NAVY)
        self.cell(100, 13, f"${total:,.2f}")

        self.set_xy(114, y + 6)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*GRAY)
        self.cell(20, 5, "USD")

        # Badge estado
        badge_color = GREEN if status == "completed" else RED
        label = "Completado" if status == "completed" else status.capitalize()
        self.set_fill_color(*badge_color)
        self.rect(14, y + 15, 32, 7, "F")
        self.set_xy(14, y + 16)
        self.set_font("Helvetica", "B", 7.5)
        self.set_text_color(*WHITE)
        self.cell(32, 5, label, align="C")

        # Ref + fecha
        self.set_xy(50, y + 16)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*GRAY)
        self.cell(80, 5, _safe(f"Ref: {txn_ref}  |  {_fmt_dt(str(created_at))}"))

        # Separador
        self.set_draw_color(*LGRAY)
        self.set_line_width(0.3)
        self.line(14, y + 27, 196, y + 27)

    # -- Seccion 2 columnas ---------------------------------------------------
    def section(self, title: str, y: float, rows: list[tuple[str, str]]) -> float:
        self.set_xy(14, y)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*ORANGE)
        self.cell(0, 5, title.upper())
        y += 7

        col_w, xs = 88, [14, 110]
        col, row_y = 0, y

        for label, value in rows:
            x = xs[col]
            self.set_xy(x, row_y)
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*GRAY)
            self.cell(col_w, 4, _safe(label))

            self.set_xy(x, row_y + 4)
            self.set_font("Helvetica", "B", 8.5)
            self.set_text_color(*BLACK)
            self.cell(col_w, 5, _safe(str(value)[:46]))

            col += 1
            if col >= 2:
                col = 0
                row_y += 14

        if col == 1:
            row_y += 14
        return row_y + 2

    # -- Bloque totales con IVA -----------------------------------------------
    def totals_block(self, subtotal: Decimal, iva: Decimal, total: Decimal, y: float) -> float:
        # Fondo suave
        self.set_fill_color(*LLGRAY)
        self.rect(110, y, 86, 36, "F")

        rows = [
            ("Subtotal (base imponible)", subtotal),
            (f"IVA 15%", iva),
        ]

        for i, (label, val) in enumerate(rows):
            ry = y + 5 + i * 10
            self.set_xy(114, ry)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(*GRAY)
            self.cell(50, 5, _safe(label))

            self.set_xy(160, ry)
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(*BLACK)
            self.cell(32, 5, f"${val:,.2f}", align="R")

        # Linea total
        self.set_draw_color(*GRAY)
        self.set_line_width(0.3)
        self.line(114, y + 25, 196, y + 25)

        # Total
        self.set_xy(114, y + 27)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*NAVY)
        self.cell(50, 6, "TOTAL")

        self.set_xy(160, y + 27)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*NAVY)
        self.cell(32, 6, f"${total:,.2f}", align="R")

        return y + 40

    # -- Divider --------------------------------------------------------------
    def divider(self, y: float) -> float:
        self.set_draw_color(*LGRAY)
        self.set_line_width(0.3)
        self.line(14, y, 196, y)
        return y + 5

    # -- Footer ---------------------------------------------------------------
    def footer_block(self):
        y = 270
        self.set_fill_color(*LGRAY)
        self.rect(0, y, 210, 27, "F")

        self.set_xy(14, y + 5)
        self.set_font("Helvetica", "B", 7.5)
        self.set_text_color(*NAVY)
        self.cell(0, 4, "MediaNetPay - Pasarela de Pagos para Ecuador")

        self.set_xy(14, y + 11)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*GRAY)
        self.cell(0, 4, "Comprobante generado automaticamente. Conserve este documento para sus registros contables.")

        self.set_xy(14, y + 17)
        self.cell(0, 4, "soporte@medianetpay.ec  |  www.medianetpay.ec  |  +593 2 123 4567")


# -- Funcion principal ---------------------------------------------------------

def generate_receipt(txn: "Transaction", merchant: "Merchant") -> bytes:
    total    = Decimal(str(txn.amount))
    subtotal, iva, _ = _calc_iva(total)

    receipt_num = (txn.medianet_ref or txn.id[:8]).upper()
    card_display = _card_display(txn.payment_method, txn.extra_data or {})

    pdf = ReceiptPDF()

    # Header con datos completos del comercio
    pdf.header_block(
        merchant_name=merchant.business_name,
        merchant_ruc=merchant.ruc or "-",
        merchant_email=getattr(merchant, "email", "") or "",
        receipt_num=receipt_num,
    )

    # Monto + estado
    pdf.amount_block(
        txn_ref=receipt_num,
        status=txn.status,
        subtotal=subtotal,
        iva=iva,
        total=total,
        created_at=txn.created_at,
    )

    # Seccion cliente
    next_y = pdf.section("Informacion del Cliente", y=88, rows=[
        ("Nombre completo",    txn.customer_name or "-"),
        ("Correo electronico", txn.customer_email or "-"),
        ("Cedula / RUC",       txn.customer_ruc_cedula or "-"),
        ("Descripcion",        txn.description or "-"),
    ])

    next_y = pdf.divider(next_y)

    # Seccion pago con ultimos 4 digitos
    next_y = pdf.section("Detalles del Pago", y=next_y, rows=[
        ("Metodo de pago",      card_display),
        ("Cuotas",              str(txn.installments) if txn.installments > 1 else "Pago unico"),
        ("Codigo autorizacion", txn.medianet_ref or "-"),
        ("Estado",              txn.status.capitalize()),
        ("ID transaccion",      txn.id),
        ("Moneda",              txn.currency),
    ])

    next_y = pdf.divider(next_y)

    # Bloque IVA - alineado a la derecha
    pdf.totals_block(subtotal=subtotal, iva=iva, total=total, y=next_y)

    pdf.footer_block()

    return bytes(pdf.output())
