#!/usr/bin/env python3
"""
MediaNetPay — Roadmap Estrategico: De Pasarela a NeoBank
Genera el PDF del plan estrategico completo.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)

# ── Colores ───────────────────────────────────────────────────────────────────
NAVY        = colors.HexColor("#003358")
NAVY_MID    = colors.HexColor("#0055A3")
NAVY_LIGHT  = colors.HexColor("#E8F0F7")
ORANGE      = colors.HexColor("#F89937")
WHITE       = colors.white
LIGHT       = colors.HexColor("#F3F4F6")
DARK        = colors.HexColor("#111827")
MID         = colors.HexColor("#6B7280")
GREEN       = colors.HexColor("#10B981")
RED         = colors.HexColor("#EF4444")
BLUE        = colors.HexColor("#0066FF")

W, H = A4  # 595 x 842 pts
INNER_W = W - 4 * cm   # ancho util con margenes de 2cm c/lado


# ── Estilos ───────────────────────────────────────────────────────────────────
def ps(name, **kw):
    return ParagraphStyle(name, **kw)


S = {
    # Portada
    "cover_title":  ps("ct", fontName="Helvetica-Bold",   fontSize=30, textColor=WHITE,  leading=38, alignment=TA_CENTER),
    "cover_sub":    ps("cs", fontName="Helvetica",         fontSize=14, textColor=colors.HexColor("#A3BFDA"), leading=20, alignment=TA_CENTER),
    "cover_meta":   ps("cm", fontName="Helvetica",         fontSize=10, textColor=colors.HexColor("#7AA3C0"), leading=15, alignment=TA_CENTER),
    # Cabeceras de seccion
    "h1":           ps("h1", fontName="Helvetica-Bold",   fontSize=15, textColor=WHITE,  leading=20),
    "h1_sub":       ps("h1s",fontName="Helvetica",         fontSize=10, textColor=colors.HexColor("#A3BFDA"), leading=14),
    "h2":           ps("h2", fontName="Helvetica-Bold",   fontSize=12, textColor=NAVY,   leading=17, spaceBefore=14, spaceAfter=5),
    "h3":           ps("h3", fontName="Helvetica-Bold",   fontSize=10, textColor=NAVY,   leading=14, spaceBefore=10, spaceAfter=4),
    # Cuerpo
    "body":         ps("bd", fontName="Helvetica",         fontSize=9.5, textColor=DARK, leading=14, spaceAfter=5, alignment=TA_JUSTIFY),
    "body_l":       ps("bl", fontName="Helvetica",         fontSize=9.5, textColor=DARK, leading=14),
    "bold":         ps("bo", fontName="Helvetica-Bold",   fontSize=9.5, textColor=DARK,  leading=14),
    "small":        ps("sm", fontName="Helvetica",         fontSize=8.5, textColor=MID,  leading=12),
    "small_b":      ps("sb", fontName="Helvetica-Bold",   fontSize=8.5, textColor=DARK,  leading=12),
    # Tablas
    "th":           ps("th", fontName="Helvetica-Bold",   fontSize=8.5, textColor=WHITE, leading=12, alignment=TA_CENTER),
    "tc":           ps("tc", fontName="Helvetica",         fontSize=8.5, textColor=DARK,  leading=12, alignment=TA_CENTER),
    "tl":           ps("tl", fontName="Helvetica",         fontSize=8.5, textColor=DARK,  leading=12, alignment=TA_LEFT),
    "tb":           ps("tbb",fontName="Helvetica-Bold",   fontSize=8.5, textColor=DARK,  leading=12, alignment=TA_LEFT),
    # Colores especiales
    "white_b":      ps("wb", fontName="Helvetica-Bold",   fontSize=9.5, textColor=WHITE, leading=14),
    "white_n":      ps("wn", fontName="Helvetica",         fontSize=9.5, textColor=colors.HexColor("#D1E8F5"), leading=14),
    "orange_b":     ps("ob", fontName="Helvetica-Bold",   fontSize=10,  textColor=ORANGE,leading=14),
    "orange_s":     ps("os", fontName="Helvetica-Bold",   fontSize=9,   textColor=ORANGE,leading=13),
    # TOC
    "toc_n":        ps("tn", fontName="Helvetica-Bold",   fontSize=10,  textColor=NAVY,  leading=19),
    "toc_t":        ps("tt", fontName="Helvetica",         fontSize=10,  textColor=DARK,  leading=19),
    # Fases (badge)
    "ph_num":       ps("pn", fontName="Helvetica-Bold",   fontSize=32,  textColor=WHITE, leading=36, alignment=TA_CENTER),
    "ph_tit":       ps("pt", fontName="Helvetica-Bold",   fontSize=11,  textColor=WHITE, leading=15, alignment=TA_CENTER),
    "ph_time":      ps("pp", fontName="Helvetica",         fontSize=8.5, textColor=colors.HexColor("#A3BFDA"), leading=12, alignment=TA_CENTER),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def sp(h=0.3):
    return Spacer(1, h * cm)


def p(text, style="body"):
    return Paragraph(text, S[style])


def hr_line():
    return HRFlowable(width="100%", thickness=0.4,
                      color=colors.HexColor("#E5E7EB"),
                      spaceAfter=6, spaceBefore=6)


def section_header(title, subtitle=None):
    """Barra navy con titulo blanco y subtitulo opcional."""
    rows = [[Paragraph(title, S["h1"])]]
    if subtitle:
        rows.append([Paragraph(subtitle, S["h1_sub"])])
    t = Table(rows, colWidths=[INNER_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING",   (0, 0), (-1, -1), 18),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 18),
        ("TOPPADDING",    (0, 0), (0,  0),  12),
        ("TOPPADDING",    (0, 1), (0,  1),  3),
        ("BOTTOMPADDING", (0,-1), (-1,-1),  12),
    ]))
    return t


def info_box(body_text, border_color=ORANGE, title=None):
    """Caja con borde izquierdo de color."""
    inner_w = INNER_W - 0.5 * cm
    rows = []
    if title:
        rows.append([Paragraph(title, S["bold"])])
    rows.append([Paragraph(body_text, S["body"])])
    content = Table(rows, colWidths=[inner_w])
    content.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), NAVY_LIGHT),
        ("TOPPADDING",   (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    strip = Table([[""]], colWidths=[0.4 * cm])
    strip.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), border_color),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    outer = Table([[strip, content]], colWidths=[0.4 * cm, inner_w])
    outer.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "STRETCH"),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return outer


def data_table(headers, rows, col_widths=None):
    """Tabla con header navy y filas alternadas."""
    if col_widths is None:
        n = len(headers)
        col_widths = [INNER_W / n] * n
    data = [[Paragraph(h, S["th"]) for h in headers]]
    for row in rows:
        styled = []
        for j, cell in enumerate(row):
            if isinstance(cell, str):
                style = S["tb"] if j == 0 else S["tc"]
                styled.append(Paragraph(cell, style))
            else:
                styled.append(cell)
        data.append(styled)
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1,  0), NAVY),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def bullet_row(text, check_color=ORANGE):
    """Fila tipo checklist con check naranja."""
    t = Table(
        [[Paragraph("v", ps("ck", fontName="Helvetica-Bold",
                             fontSize=9, textColor=check_color, leading=14)),
          Paragraph(text, S["body_l"])]],
        colWidths=[0.6 * cm, INNER_W - 0.6 * cm]
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), NAVY_LIGHT),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (0,  0),  8),
        ("LEFTPADDING",  (1, 0), (1,  0),  6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW",    (0, 0), (-1, -1), 0.3, colors.HexColor("#C8D8E8")),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def priority_block(title, color, items):
    """Bloque de prioridad con header coloreado y lista de acciones."""
    elements = []
    header = Table([[Paragraph(title, S["white_b"])]], colWidths=[INNER_W])
    header.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), color),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (-1, -1), 14),
    ]))
    elements.append(header)
    for item in items:
        elements.append(bullet_row(item, check_color=ORANGE))
    elements.append(sp(0.3))
    return elements


# ── Documento ─────────────────────────────────────────────────────────────────

OUTPUT = r"C:\Users\stanley\Desktop\MediaNetPay\Docs\MediaNetPay_NeoBank_Roadmap.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm,  bottomMargin=2*cm,
    title="MediaNetPay — Roadmap Estrategico: De Pasarela a NeoBank",
    author="MediaNetPay",
)

story = []

# ─────────────────────────────────────────────────────────────────────────────
# PORTADA
# ─────────────────────────────────────────────────────────────────────────────
cover = Table([
    [Paragraph("MediaNetPay", S["cover_sub"])],
    [sp(0.6)],
    [Paragraph("De Pasarela de Pagos", S["cover_title"])],
    [Paragraph("a NeoBank Ecuatoriano", S["cover_title"])],
    [sp(0.5)],
    [Paragraph("Roadmap Estrategico 2025 — 2030", S["cover_sub"])],
    [sp(1.2)],
    [Paragraph("Plan completo de fases, estructura legal internacional,", S["cover_meta"])],
    [Paragraph("acceso a liquidez de stablecoins, costos reales y modelo de negocio", S["cover_meta"])],
    [sp(2.5)],
    [Paragraph("Junio 2026  |  Documento Confidencial  |  Uso Interno", S["cover_meta"])],
], colWidths=[INNER_W])
cover.setStyle(TableStyle([
    ("BACKGROUND",   (0, 0), (-1, -1), NAVY),
    ("TOPPADDING",   (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ("LEFTPADDING",  (0, 0), (-1, -1), 30),
    ("RIGHTPADDING", (0, 0), (-1, -1), 30),
    ("TOPPADDING",   (0, 0), (0,  0),  90),
    ("BOTTOMPADDING",(0,-1), (-1,-1),  90),
    ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
]))
story.append(cover)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# TABLA DE CONTENIDOS
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("Tabla de Contenidos"))
story.append(sp(0.5))

toc = [
    ("01", "Vision General — La Escalera Estrategica"),
    ("02", "Fase 1 — El Stripe Ecuatoriano  (Hoy — 18 meses)"),
    ("03", "Fase 2 — BananaPay y la Economia Informal  (12 — 36 meses)"),
    ("04", "Fase 3 — Exchange de Stablecoins USDC/USDT  (18 — 36 meses)"),
    ("05", "Estructura Legal Internacional — Delaware LLC + Ecuador"),
    ("06", "El Vacio Legal en Ecuador — Analisis Regulatorio Crypto"),
    ("07", "Fase 4 — Datos y Microcredito  (24 — 48 meses)"),
    ("08", "Fase 5 — NeoBank Completo  (36 — 60+ meses)"),
    ("09", "Tabla de Costos Completa por Fase"),
    ("10", "Proximos Pasos — Acciones Inmediatas"),
]
for num, title in toc:
    row = Table(
        [[Paragraph(num, S["toc_n"]), Paragraph(title, S["toc_t"])]],
        colWidths=[1.2 * cm, INNER_W - 1.2 * cm]
    )
    row.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
        ("LINEBELOW",    (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(row)

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 01 — VISION GENERAL
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("01 — Vision General", "La escalera estrategica de MediaNetPay"))
story.append(sp(0.4))
story.append(p(
    "MediaNetPay tiene una oportunidad unica en Ecuador: construir la infraestructura "
    "financiera que los bancos tradicionales no pueden — o no quieren — construir para "
    "la economia informal. La estrategia es una escalera de cinco fases donde cada piso "
    "financia y alimenta al siguiente."
))
story.append(sp(0.3))

# Timeline de 5 fases
phase_colors = [NAVY, NAVY_MID, BLUE, ORANGE, colors.HexColor("#C96B0A")]
phase_data = [
    ("1", "Stripe\nEcuator.", "Hoy\n18m"),
    ("2", "BananaPay\nInformal", "12-36m"),
    ("3", "Stable-\ncoins", "18-36m"),
    ("4", "Datos &\nCredito", "24-48m"),
    ("5", "Neo-\nBank", "36-60m+"),
]
phase_cells = []
for i, (num, title, time) in enumerate(phase_data):
    cell = Table([
        [Paragraph(num, S["ph_num"])],
        [Paragraph(title, S["ph_tit"])],
        [Paragraph(time, S["ph_time"])],
    ], colWidths=[INNER_W / 5])
    cell.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), phase_colors[i]),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    phase_cells.append(cell)

phases_t = Table([phase_cells], colWidths=[INNER_W / 5] * 5)
phases_t.setStyle(TableStyle([
    ("TOPPADDING",   (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ("LEFTPADDING",  (0, 0), (-1, -1), 1),
    ("RIGHTPADDING", (0, 0), (-1, -1), 1),
]))
story.append(phases_t)
story.append(sp(0.4))

story.append(info_box(
    "El activo mas valioso no son los pagos — son los datos transaccionales de personas "
    "sin historial crediticio formal. Un vendedor que mueve $800/mes por BananaPay es "
    "sujeto de credito. Ningun banco lo sabe. MediaNetPay si.",
    ORANGE, "La ventaja competitiva clave"
))
story.append(sp(0.3))

story.append(p("La progresion de ingresos por fase:", "h3"))
story.append(data_table(
    ["Fase", "Ingreso Principal", "Ingreso Secundario", "Fuente de datos"],
    [
        ["1 — Pasarela",   "MDR por transaccion (2.5-3.5%)",      "Fee de retiro",                    "Comercios"],
        ["2 — BananaPay",  "Float sobre saldos + fee retiro efectivo", "Agentes cash-in/out ($0.25)", "Usuarios informales"],
        ["3 — Stablecoins","Fee fijo $0.50-$1.00 por compra",     "Spread residual minimo",           "Compradores crypto"],
        ["4 — Credito",    "Intereses microcredito (15-35%/anual)","Primas microseguros",              "Historial transaccional"],
        ["5 — NeoBank",    "Todo lo anterior + cuenta + tarjeta",  "Inversiones + nomina",             "Ecosistema completo"],
    ],
    col_widths=[2.8*cm, 5.5*cm, 4.2*cm, 3*cm]
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 02 — FASE 1
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("02 — Fase 1: El Stripe Ecuatoriano", "Hoy — 18 meses | Penetracion de comercios"))
story.append(sp(0.4))
story.append(p(
    "Esta fase ya esta en ejecucion. El objetivo es volumen de comercios y TPV "
    "(Total Payment Volume). Cada comercio que entra trae a sus clientes — los "
    "usuarios del neobank de manana."
))
story.append(sp(0.3))

story.append(p("Productos actuales:", "h3"))
story.append(data_table(
    ["Producto", "Descripcion", "Modelo de cobro"],
    [
        ["WebCheckout",       "Pagina de pago hosted. Redireccion o iframe.",      "MDR 2.5-3.5%"],
        ["SoftPOS",           "Smartphone como terminal NFC. Sin hardware extra.", "MDR + $0.30 fijo"],
        ["Payment Links",     "Links de cobro para vendedores sin sitio web.",     "MDR 2.5%"],
        ["Plugin WooCommerce","Integracion directa con tiendas WordPress.",        "MDR + $15/mes opcional"],
        ["Plugin PrestaShop", "Integracion directa con tiendas PrestaShop.",       "MDR + $15/mes opcional"],
        ["API REST",          "Integracion personalizada para desarrolladores.",   "MDR segun volumen"],
    ],
    col_widths=[4*cm, 8*cm, 3.5*cm]
))
story.append(sp(0.3))

story.append(p("Estado legal — Fase 1:", "h3"))
story.append(info_box(
    "MediaNetPay opera registrada en Supercias. Para procesar tarjetas trabaja bajo "
    "contrato con bancos adquirentes ecuatorianos. El banco adquirente tiene la licencia; "
    "MediaNetPay es la capa tecnologica. No se requiere licencia bancaria adicional. "
    "Estado: operacion completamente legal y en regla.",
    GREEN, "Situacion legal: CLARA y OPERATIVA"
))
story.append(sp(0.3))

story.append(p("Metricas objetivo:", "h3"))
story.append(data_table(
    ["Metrica", "Objetivo Mes 12", "Objetivo Mes 18"],
    [
        ["Comercios activos",          "> 500",         "> 2,000"],
        ["TPV mensual",                "> $500,000",    "> $2,000,000"],
        ["Retencion a 6 meses",        "> 70%",         "> 80%"],
        ["Tiempo onboarding comercio", "< 48 horas",    "< 24 horas"],
        ["Chargeback rate",            "< 0.5%",        "< 0.3%"],
    ],
    col_widths=[6*cm, 4.5*cm, 5*cm]
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 03 — FASE 2 — BANANAPAY
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("03 — Fase 2: BananaPay y la Economia Informal", "Meses 12 — 36 | Captura del mercado informal"))
story.append(sp(0.4))
story.append(p(
    "La economia informal ecuatoriana es masiva. Vendedores de mercado, transportistas, "
    "microempresarios — todos usan WhatsApp todos los dias y ningun banco los sirve bien. "
    "BananaPay es el producto para ese segmento. El canal es WhatsApp porque ya esta ahi."
))
story.append(sp(0.3))

story.append(p("Productos BananaPay:", "h3"))
story.append(data_table(
    ["Producto", "Descripcion", "Monetizacion"],
    [
        ["Wallet USD WhatsApp",  "Saldo en dolares dentro del ecosistema. Sin costo de mantenimiento.", "Float sobre saldo"],
        ["P2P gratuito",         "Transferencias entre usuarios BananaPay. Costo cero para el usuario.", "Datos transaccionales"],
        ["QR de Cobro",          "QR unico por cobro. Cliente paga con su app bancaria.",               "MDR reducido 0.8-1%"],
        ["Cash-in / Cash-out",   "Red de agentes en tiendas de barrio. Depositar y retirar efectivo.",  "Fee $0.50 por operacion"],
        ["Deposito via De Una",  "Recarga desde cualquier banco ecuatoriano via BCE.",                   "Fee $0.10"],
        ["Retiro a banco",       "Transferencia a cuenta bancaria ecuatoriana.",                         "Fee $0.25 - $0.50"],
    ],
    col_widths=[3.8*cm, 7.5*cm, 4.2*cm]
))
story.append(sp(0.3))

story.append(info_box(
    "Como M-Pesa en Kenya o Yape en Peru. Cada tienda de barrio que acepta depositos "
    "y retiros en efectivo es un agente BananaPay. El comercio gana $0.25 por operacion "
    "y atrae trafico adicional. BananaPay gana cobertura geografica sin costo fijo ni "
    "sucursales. La red se escala sola.",
    ORANGE, "La red de agentes — expansion sin CAPEX"
))
story.append(sp(0.3))

story.append(p("Estado legal — Fase 2:", "h3"))
story.append(info_box(
    "Un wallet que custodia USD requiere figura de 'entidad auxiliar del sistema financiero' "
    "segun la LGISF ecuatoriana. Ecuador no tiene bien definida la figura de 'entidad de pago' "
    "como Mexico (FINTECH) o Colombia. La ruta mas rapida y limpia: ALIANZA CON BANCO "
    "ECUATORIANO. El banco pone la licencia de custodia, MediaNetPay pone tecnologia y usuarios. "
    "Modelo probado: Yape+BCP (Peru), Nequi+Bancolombia (Colombia).",
    RED, "Requiere estructura legal adicional antes de lanzar"
))
story.append(sp(0.3))

story.append(p("Costos estimados alianza bancaria:", "h3"))
story.append(data_table(
    ["Item", "Costo Estimado", "Frecuencia"],
    [
        ["Honorarios legales — estructuracion contrato alianza", "$15,000 - $40,000", "Una vez"],
        ["Due diligence banco socio",                           "$5,000 - $10,000",  "Una vez"],
        ["Integracion tecnica API bancaria + De Una",           "$20,000 - $50,000", "Una vez"],
        ["Sistema compliance AML/KYC",                          "$8,000 - $15,000",  "Una vez"],
        ["Onboarding y capacitacion red de agentes",            "$10,000 - $20,000", "Una vez"],
        ["TOTAL",                                               "$58,000 - $135,000",""],
    ],
    col_widths=[8*cm, 4*cm, 3.5*cm]
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 04 — FASE 3 — STABLECOINS
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("04 — Fase 3: Exchange de Stablecoins", "Meses 18 — 36 | El golpe al mercado P2P"))
story.append(sp(0.4))
story.append(p(
    "Ecuador tiene uno de los mercados P2P de crypto mas activos de Latinoamerica. "
    "En Binance P2P, comprar USDT cuesta entre $1.02 y $1.06 — un spread de 2-6% que "
    "se llevan traders locales. MediaNetPay puede ofrecer USDC/USDT a $1.00 exacto "
    "mas un fee fijo minimo comprando directamente a los emisores. El producto se vende solo."
))
story.append(sp(0.3))

story.append(p("Ventaja competitiva vs mercado actual:", "h3"))
story.append(data_table(
    ["Plataforma", "Precio USDT", "Costo real en $500", "Confianza", "Velocidad"],
    [
        ["Binance P2P",  "$1.02 - $1.06", "$10 - $30 extra", "Contraparte anon.", "Manual, lento"],
        ["MediaNetPay",  "$1.00 + $0.50 fee", "~$0.10%", "Empresa registrada", "Instantaneo WA"],
        ["Ahorro usuario", "", "~$9.50 - $29.50", "", ""],
    ],
    col_widths=[3.5*cm, 3*cm, 3.5*cm, 3.5*cm, 2*cm]
))
story.append(sp(0.3))

story.append(p("Proveedor 1 — Circle Mint (USDC) — RECOMENDADO PARA INICIAR:", "h3"))
circle_rows = [
    ("Costo de acceso",    "GRATUITO para instituciones calificadas"),
    ("Conversion",         "1:1 exacta USD <-> USDC sin spread de ningún tipo"),
    ("Disponibilidad",     "185 paises, 24/7, multiples blockchains"),
    ("Onboarding",         "Semanas (KYC/AML empresarial). Iniciar cuanto antes."),
    ("Capital minimo",     "No publicado — evaluado caso a caso por Circle"),
    ("Requisito",          "Ser empresa: fintech, wallet, exchange, app de pagos"),
    ("Por que es ideal",   "Circle es el EMISOR directo de USDC. Precio mas bajo posible. Eliminas todo intermediario."),
    ("Aplicacion",         "circle.com/circle-mint (formulario online gratuito)"),
]
for label, value in circle_rows:
    row_t = Table(
        [[Paragraph(label, S["tb"]), Paragraph(value, S["tl"])]],
        colWidths=[4*cm, INNER_W - 4*cm]
    )
    row_t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), NAVY_LIGHT),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (0,  0),  10),
        ("LEFTPADDING",  (1, 0), (1,  0),  6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW",    (0, 0), (-1, -1), 0.3, colors.HexColor("#C8D8E8")),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(row_t)

story.append(sp(0.3))
story.append(p("Proveedor 2 — OTC Desks para USDT (Tether no vende directo a escala inicial):", "h3"))
story.append(data_table(
    ["OTC Desk", "Minimo por Operacion", "Spread aprox.", "Requisito", "Accesibilidad"],
    [
        ["Binance OTC Inst.", "$10,000 - $50,000", "~0.05%", "Cuenta inst. + KYC", "MUY ALTA — empezar aqui"],
        ["FalconX",          "$100,000+",          "~0.02-0.05%", "Empresa + AML",  "MEDIA"],
        ["B2C2",             "$100,000+",          "~0.02%",      "Empresa verificada", "MEDIA"],
        ["Cumberland (DRW)", "$1,000,000+",        "~0.01%",      "Gran institucion","BAJA — solo a escala"],
    ],
    col_widths=[3.5*cm, 3.5*cm, 2.5*cm, 4*cm, 2*cm]
))
story.append(sp(0.3))

story.append(p("Estrategia de liquidez por etapa de crecimiento:", "h3"))
story.append(data_table(
    ["Etapa", "Inventario", "Proveedores", "Timeline acceso"],
    [
        ["Arranque",    "$30,000 - $100,000",  "Circle Mint (USDC) + Binance OTC (USDT)", "2-6 semanas"],
        ["Crecimiento", "$100,000 - $500,000", "Circle + FalconX",                         "Ya con historial"],
        ["Escala",      "$500,000+/mes",        "Circle + Tether directo + market maker",   "Con volumen probado"],
    ],
    col_widths=[2.8*cm, 4*cm, 6.2*cm, 2.5*cm]
))
story.append(sp(0.3))

story.append(p("Modelo de rentabilidad — ejemplo real:", "h3"))
story.append(info_box(
    "Escenario: 500 operaciones/mes promedio $200 USDC c/u = $100,000 volumen mensual.\n"
    "Ingresos: 500 operaciones x $0.50 fee = $250/mes en fees.\n"
    "Costo liquidez Circle: $0 (conversion gratuita 1:1).\n"
    "Costo Binance OTC (USDT): $100,000 x 0.05% = $50.\n"
    "Margen neto estimado: ~$200/mes sobre $100K volumen = 0.2%.\n"
    "A escala de $1M/mes: ~$2,000/mes solo en fees, mas float sobre inventario.",
    NAVY, "Proyeccion de rentabilidad"
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 05 — ESTRUCTURA LEGAL INTERNACIONAL
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("05 — Estructura Legal Internacional", "Delaware LLC + MediaNetPay Ecuador S.A."))
story.append(sp(0.4))
story.append(p(
    "Para acceder a Circle Mint, Binance OTC institucional y banca americana, "
    "MediaNetPay necesita una entidad en una jurisdiccion con acceso pleno al "
    "sistema financiero internacional. La estructura optima es una LLC en Delaware "
    "propietaria de MediaNetPay Ecuador. Esta estructura es estandar global — "
    "la usan desde startups hasta Fortune 500."
))
story.append(sp(0.3))

# Estructura visual
top_box = Table(
    [[Paragraph("MediaNetPay International LLC", S["white_b"]),
      Paragraph("(Delaware, USA)", S["white_n"])]],
    colWidths=[9*cm, INNER_W - 9*cm]
)
top_box.setStyle(TableStyle([
    ("BACKGROUND",   (0, 0), (-1, -1), NAVY),
    ("TOPPADDING",   (0, 0), (-1, -1), 13),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 13),
    ("LEFTPADDING",  (0, 0), (-1, -1), 18),
    ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
]))
arrow_box = Table(
    [[Paragraph("| propietaria al 100% | contrato de distribucion de activos digitales |",
                ps("ar", fontName="Helvetica-Bold", fontSize=9, textColor=ORANGE,
                   leading=13, alignment=TA_CENTER))]],
    colWidths=[INNER_W]
)
arrow_box.setStyle(TableStyle([
    ("TOPPADDING",   (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
    ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
]))
bot_box = Table(
    [[Paragraph("MediaNetPay Ecuador S.A.", S["white_b"]),
      Paragraph("(Supercias — ya constituida)", S["white_n"])]],
    colWidths=[9*cm, INNER_W - 9*cm]
)
bot_box.setStyle(TableStyle([
    ("BACKGROUND",   (0, 0), (-1, -1), NAVY_MID),
    ("TOPPADDING",   (0, 0), (-1, -1), 13),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 13),
    ("LEFTPADDING",  (0, 0), (-1, -1), 18),
    ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
]))
story.extend([top_box, arrow_box, bot_box, sp(0.4)])

story.append(p("Comparacion de jurisdicciones:", "h3"))
story.append(data_table(
    ["Criterio", "Delaware LLC (PREFERIDA)", "Panama S.A."],
    [
        ["Costo constitucion",         "$500 - $1,500",        "$1,000 - $2,000"],
        ["Tiempo registro",            "1-2 dias",             "3-5 dias"],
        ["Privacidad accionistas",     "Alta",                 "Muy alta"],
        ["Banca USA (Mercury/Relay)",  "Si — acceso directo",  "Limitado"],
        ["Circle Mint",                "Si — acepta LLC USA",  "Si — acepta SA Panama"],
        ["Binance Institutional",      "Si",                   "Si"],
        ["Impuestos",                  "Solo si opera en USA", "Exento si no opera en Panama"],
        ["Recomendacion",              "PREFERIDA",            "Alternativa valida"],
    ],
    col_widths=[5.5*cm, 5*cm, 5*cm]
))
story.append(sp(0.3))

story.append(p("Como funciona operativamente:", "h3"))
for item in [
    "La LLC de Delaware abre cuenta en Mercury Bank (USA) y aplica a Circle Mint y Binance OTC. Compra USDC/USDT al precio institucional.",
    "MediaNetPay Ecuador S.A. tiene la relacion con el usuario final, procesa pagos y cumple con el SRI ecuatoriano.",
    "Entre ambas existe un 'contrato de distribucion y licencia de activos digitales': la LLC vende a la ecuatoriana, la ecuatoriana vende al usuario.",
    "Reguladores ecuatorianos supervisan a MediaNetPay Ecuador. La LLC esta bajo jurisdiccion del estado de Delaware.",
    "SRI cobra impuestos sobre utilidades de MediaNetPay Ecuador. La LLC presenta sus propias declaraciones en USA.",
]:
    story.append(bullet_row(item))
story.append(sp(0.3))

story.append(p("Costos de constitucion y mantenimiento anual:", "h3"))
story.append(data_table(
    ["Item", "Costo", "Frecuencia"],
    [
        ["Constitucion LLC Delaware (servicios online: Stripe Atlas, Firstbase, Northwest)", "$39 - $500 + state fee $90", "Una vez"],
        ["Registered Agent Delaware (obligatorio por ley)",          "$100 - $300",      "Anual"],
        ["Cuenta Mercury Bank (fintech-friendly, 100% online)",      "Gratuita",         "Anual"],
        ["EIN (Tax ID USA — tramite directo con IRS)",               "Gratuito",         "Una vez"],
        ["Honorarios abogado estructura corporativa (opcional)",     "$2,000 - $5,000",  "Una vez"],
        ["Declaracion impuestos USA (si aplica — Form 5472)",        "$500 - $1,500",    "Anual"],
        ["TOTAL PRIMER ANO",                                         "$2,729 - $7,390",  ""],
    ],
    col_widths=[9*cm, 4*cm, 2.5*cm]
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 06 — VACIO LEGAL ECUADOR
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("06 — El Vacio Legal en Ecuador", "Analisis regulatorio del mercado crypto"))
story.append(sp(0.4))
story.append(p(
    "Ecuador tiene una regulacion crypto ambigua: no hay prohibicion explicita ni marco "
    "regulatorio claro. Esa zona gris es una oportunidad real para quien la estructura bien."
))
story.append(sp(0.3))

legal_blocks = [
    (NAVY, "BCE 2014 — Nota de Prensa (NO es ley)",
     "El BCE publico en 2014 una aclaracion diciendo que Bitcoin no es moneda de curso "
     "legal en Ecuador. Fue una nota informativa, NO una resolucion vinculante, NO una ley. "
     "No tiene fuerza legal para prohibir operaciones crypto. Nunca ha sido invocada en "
     "ningun proceso judicial."),
    (NAVY_MID, "Constitucion Ecuatoriana",
     "Establece el USD como unica moneda de curso legal. Las criptomonedas como MEDIO DE "
     "PAGO sustituto del dolar estan prohibidas implicitamente. Sin embargo, USDT y USDC "
     "no son un medio de pago alternativo — son el dolar mismo en formato digital. "
     "Esa distincion semantica y legal es el centro del argumento defensivo."),
    (RED, "Lo que NO existe en Ecuador",
     "Ley de Activos Digitales. Marco VASP (Virtual Asset Service Provider). Regulacion "
     "especifica de exchanges crypto. Requisito de licencia para compra/venta de USDT/USDC. "
     "Prohibicion explicita de servicios de custodia de stablecoins. Jurisprudencia en "
     "contra de empresas crypto."),
    (GREEN, "Lo que SI existe y aplica",
     "Obligacion de reportar al SRI cualquier ingreso, incluyendo crypto (declaracion de "
     "impuesto a la renta). Normativa AML/KYC general del sistema financiero. Codigo de "
     "Comercio para actividades mercantiles regulares. Ley de Comercio Electronico."),
]
for color, title, text in legal_blocks:
    story.append(info_box(text, color, title))
    story.append(sp(0.2))

story.append(sp(0.2))
story.append(p("El argumento legal que protege la operacion:", "h3"))
story.append(info_box(
    "\"MediaNetPay no opera un exchange de criptomonedas. Opera un servicio de custodia y "
    "transferencia de activos digitales denominados en USD, funcionalmente equivalentes al "
    "dolar que circula en la economia ecuatoriana. USDC y USDT son representaciones digitales "
    "del dolar — no activos especulativos. En un pais 100% dolarizado, ofrecer dolares "
    "digitales es semanticamente equivalente a ofrecer dolares fisicos.\"",
    ORANGE, "Posicion legal defensible — elaborada por counsel"
))
story.append(sp(0.3))

story.append(p("Precedentes relevantes en Ecuador:", "h3"))
story.append(data_table(
    ["Caso", "Situacion", "Impacto para MediaNetPay"],
    [
        ["Binance P2P",       "Opera en Ecuador sin licencia local. Sin sanciones.",         "Positivo — precedente de tolerancia"],
        ["LocalBitcoins",     "Opero anos en Ecuador sin restricciones regulatorias.",       "Positivo — sin acciones legales"],
        ["Coinbase / Kraken", "Accesibles desde Ecuador sin bloqueos del BCE ni SBS.",      "Positivo — no hay voluntad regulatoria"],
        ["Jurisprudencia",    "Cero fallos judiciales ecuatorianos contra servicios crypto.","Positivo — campo limpio"],
    ],
    col_widths=[3.5*cm, 7*cm, 5*cm]
))
story.append(sp(0.3))

story.append(info_box(
    "Accion inmediata recomendada: contratar un estudio legal ecuatoriano especializado en "
    "fintech para obtener una opinion escrita sobre la operacion. Costo: $5,000 - $10,000. "
    "Este documento protege a directivos y accionistas, y es requerido por bancos e "
    "inversores en cualquier proceso de due diligence. Estudios con practica fintech "
    "en Ecuador: Bustamante & Bustamante, Coronel & Perez, MBS Abogados.",
    NAVY, "Accion legal inmediata recomendada"
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 07 — FASE 4 — DATOS Y CREDITO
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("07 — Fase 4: Datos y Microcredito", "Meses 24 — 48 | Monetizar el historial transaccional"))
story.append(sp(0.4))
story.append(p(
    "Con 2 anos de datos transaccionales reales de personas que los bancos no conocen, "
    "aparecen los productos financieros mas rentables: credito y seguros. El scoring "
    "propio de MediaNetPay es el activo diferencial que ningun banco tradicional puede replicar."
))
story.append(sp(0.3))

story.append(info_box(
    "Un vendedor del mercado que mueve $800/mes por BananaPay durante 18 meses tiene "
    "historial de ingresos real, consistente y verificable. MediaNetPay conoce sus "
    "patrones de cobro, clientes habituales y red comercial. Eso es exactamente lo que "
    "necesitas para dar credito — y que NINGUN banco tiene de esa persona porque nunca "
    "fue su cliente. Ese scoring propio vale mucho mas que la tecnologia.",
    ORANGE, "El scoring propio — el activo diferencial"
))
story.append(sp(0.3))

story.append(p("Productos Fase 4:", "h3"))
story.append(data_table(
    ["Producto", "Monto", "Base de elegibilidad", "Tasa referencial"],
    [
        ["Adelanto de efectivo",    "$50 - $500",    "Automatico — proximo deposito como garantia",          "~5% fijo por adelanto"],
        ["Microcredito a comercio", "$500 - $5,000", "Ventas MediaNetPay historial minimo 6 meses",          "15-25% anual"],
        ["Microcredito personal",   "$100 - $1,000", "Transacciones BananaPay historial minimo 6 meses",     "20-35% anual"],
        ["Microseguro accidente",   "$2 - $8/mes",   "Cualquier usuario activo — activado por WhatsApp",     "Prima fija"],
        ["Seguro de vida",          "$3 - $15/mes",  "Usuarios con saldo minimo $100 en wallet",             "Prima fija"],
        ["Ahorro automatico",       "Flexible",       "Redondeo de cada transaccion — opt-in por WhatsApp",  "Sin costo"],
    ],
    col_widths=[3.8*cm, 2.8*cm, 6*cm, 2.9*cm]
))
story.append(sp(0.3))

story.append(p("Estructuras legales para operar credito en Ecuador:", "h3"))
story.append(info_box(
    "RUTA 1 — ALIANZA CON COOPERATIVA (RECOMENDADA PARA INICIAR): Una cooperativa "
    "regulada por SEPS emite el credito usando el scoring de MediaNetPay. La cooperativa "
    "asume el riesgo regulatorio. MediaNetPay recibe comision de originacion (2-5% del "
    "monto). Tiempo: 6-12 meses de negociacion. Capital requerido: ninguno adicional.",
    GREEN, "Ruta 1: Alianza con Cooperativa — Mas rapida"
))
story.append(sp(0.15))
story.append(info_box(
    "RUTA 2 — SOCIEDAD FINANCIERA PROPIA: Licencia de la SBS como Sociedad Financiera. "
    "Capital minimo exigido: $2,600,000 USD. Tiempo de proceso regulatorio: 18-36 meses. "
    "Control total del producto pero requiere capital significativo y proceso largo.",
    RED, "Ruta 2: Licencia propia SBS — Mas control, mas capital"
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 08 — FASE 5 — NEOBANK
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("08 — Fase 5: NeoBank Completo", "Meses 36 — 60+ | La vision final"))
story.append(sp(0.4))
story.append(p(
    "El neobank no es el punto de partida — es el destino natural de la escalera. "
    "Para cuando se llega aqui, MediaNetPay ya tiene cientos de miles de usuarios activos, "
    "historial transaccional profundo y relaciones bancarias establecidas."
))
story.append(sp(0.3))

story.append(p("Productos NeoBank:", "h3"))
story.append(data_table(
    ["Producto", "Descripcion", "Requerimiento Legal"],
    [
        ["Cuenta de deposito digital", "Cuenta en USD con codigo bancario ecuatoriano. Sin costo de mantenimiento.", "Licencia bancaria o alianza"],
        ["Tarjeta debito BananaPay",   "Fisica y virtual. Mastercard o Visa. Sin costos de emision.", "Alianza Mastercard/Visa + banco emisor"],
        ["Tarjeta virtual ecommerce",  "Generacion instantanea desde WhatsApp para compras online.", "Alianza banco emisor"],
        ["Inversiones basicas",        "Fondos de renta fija en USD. Rendimiento 4-7% anual.", "Registro como gestora de inversiones"],
        ["Nomina microempresas",       "Pago de nomina a empleados via BananaPay. Sin costo.", "Solo acuerdo comercial"],
        ["Seguro de vida completo",    "Producto completo con aseguradora partner.",             "Alianza aseguradora regulada"],
    ],
    col_widths=[4.5*cm, 7*cm, 4*cm]
))
story.append(sp(0.3))

story.append(p("Las tres rutas regulatorias para el NeoBank:", "h3"))
story.append(data_table(
    ["Ruta", "Capital/Costo", "Tiempo", "Ventaja", "Desventaja"],
    [
        ["Alianza bancaria\n(RECOMENDADA)", "Negociacion\nsin capital propio", "12-18 meses", "Rapido al mercado", "Menos control del producto"],
        ["Licencia SBS propia",            "$17M USD capital minimo",          "3-5 anos",   "Control total",    "Capital muy elevado + proceso largo"],
        ["Adquisicion banco pequeno",       "$5M - $20M precio compra",        "6-12m post-compra", "Licencia lista", "Riesgo y pasivos heredados"],
    ],
    col_widths=[3.8*cm, 3.8*cm, 2.5*cm, 3.5*cm, 2.9*cm]
))
story.append(sp(0.3))

story.append(p("Referentes que siguieron esta escalera:", "h3"))
refs = [
    ("Nubank (Brasil, 2013)", "Comenzo con tarjeta sin costo -> cuenta -> inversiones. Hoy: $90B de valoracion, 100M+ clientes en Latinoamerica."),
    ("Yape (Peru, 2016)",     "P2P gratuito del BCP -> wallet -> credito. Hoy: 14M usuarios en Peru. La app mas descargada del pais."),
    ("Nequi (Colombia, 2016)","Wallet digital de Bancolombia -> microcredito -> cuenta. Hoy: 18M usuarios en Colombia."),
    ("Tigo Money (C. America)","Pagos moviles para no bancarizados -> wallet -> credito. Opera en 5 paises con modelo de agentes."),
]
for company, desc in refs:
    story.append(info_box(desc, ORANGE, company))
    story.append(sp(0.15))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 09 — COSTOS COMPLETOS
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("09 — Tabla de Costos Completa", "Inversion estimada por fase — CAPEX y OPEX"))
story.append(sp(0.4))
story.append(p(
    "Estimaciones basadas en proveedores reales y referencias de mercado latinoamericano. "
    "Los rangos reflejan variacion segun negociacion, escala y velocidad de ejecucion."
))
story.append(sp(0.3))

story.append(p("Fase 1 — El Stripe Ecuatoriano:", "h3"))
story.append(data_table(["Item", "Costo", "Tipo"], [
    ["Desarrollo plataforma (ya invertido)",          "$0",                  "CAPEX existente"],
    ["Integracion bancos adquirentes adicionales",    "$5,000 - $15,000",    "CAPEX"],
    ["Legal — contratos adquirentes y SLAs",          "$3,000 - $8,000",     "CAPEX"],
    ["Marketing y adquisicion de comercios (anual)",  "$20,000 - $60,000",   "OPEX/anual"],
    ["Soporte y operaciones (anual)",                 "$30,000 - $60,000",   "OPEX/anual"],
    ["TOTAL FASE 1 (primer ano)",                     "$58,000 - $143,000",  ""],
], col_widths=[8.5*cm, 4*cm, 3*cm]))
story.append(sp(0.3))

story.append(p("Fase 2 — BananaPay / Economia Informal:", "h3"))
story.append(data_table(["Item", "Costo", "Tipo"], [
    ["Desarrollo BananaPay + integracion WhatsApp",  "$30,000 - $80,000",   "CAPEX"],
    ["Alianza bancaria — honorarios legales",         "$15,000 - $40,000",   "CAPEX"],
    ["Integracion De Una (BCE)",                      "$10,000 - $25,000",   "CAPEX"],
    ["Sistema AML/KYC de usuarios",                   "$8,000 - $15,000",    "CAPEX"],
    ["Onboarding y capacitacion red de agentes",      "$10,000 - $20,000",   "CAPEX"],
    ["Operacion mensual (equipo + infra)",             "$8,000 - $20,000",    "OPEX/mes"],
    ["TOTAL CAPEX FASE 2",                            "$73,000 - $180,000",  ""],
], col_widths=[8.5*cm, 4*cm, 3*cm]))
story.append(sp(0.3))

story.append(p("Fase 3 — Exchange de Stablecoins:", "h3"))
story.append(data_table(["Item", "Costo", "Tipo"], [
    ["Constitucion Delaware LLC (Stripe Atlas / Firstbase)", "$500 - $1,500",  "CAPEX"],
    ["Registered Agent anual Delaware",                      "$100 - $300",    "OPEX/anual"],
    ["Cuenta bancaria Mercury USA",                          "Gratuita",        ""],
    ["Onboarding Circle Mint",                               "Gratuito",        ""],
    ["Opinion legal crypto Ecuador (estudio especializado)", "$5,000 - $10,000","CAPEX"],
    ["Integracion API Circle + Binance OTC",                 "$8,000 - $20,000","CAPEX"],
    ["Sistema AML/KYC especifico crypto",                    "$5,000 - $10,000","CAPEX"],
    ["Inventario inicial USDC/USDT (capital de trabajo)",    "$30,000 - $100,000","CAPITAL"],
    ["TOTAL CAPEX + LEGAL (sin inventario)",                 "$18,600 - $41,800",""],
    ["TOTAL INCLUYENDO INVENTARIO INICIAL",                  "$48,600 - $141,800",""],
], col_widths=[8.5*cm, 4*cm, 3*cm]))
story.append(sp(0.3))

story.append(p("Fase 4 — Datos y Microcredito:", "h3"))
story.append(data_table(["Item", "Costo", "Tipo"], [
    ["Alianza cooperativa — estructuracion legal",   "$10,000 - $20,000",   "CAPEX"],
    ["Sistema de scoring crediticio propio",          "$20,000 - $50,000",   "CAPEX"],
    ["Capital semilla cartera de credito",            "$100,000 - $500,000", "CAPITAL"],
    ["Licencia Sociedad Financiera SBS (si aplica)",  "$2,600,000 minimo",   "CAPITAL (largo plazo)"],
    ["TOTAL RUTA COOPERATIVA (recomendada)",          "$130,000 - $570,000", ""],
], col_widths=[8.5*cm, 4*cm, 3*cm]))
story.append(sp(0.3))

story.append(p("Resumen ejecutivo de inversion total:", "h3"))
story.append(data_table(
    ["Fase", "Horizonte", "Inversion Estimada", "Primera fuente de ingresos"],
    [
        ["1 — Stripe Ecuatoriano", "Hoy — 18m",  "$58,000 - $143,000",    "MDR desde mes 1"],
        ["2 — BananaPay Informal", "12 — 36m",   "$73,000 - $180,000",    "Float + fees desde mes 3"],
        ["3 — Stablecoins",        "18 — 36m",   "$48,600 - $141,800",    "Fee por operacion desde dia 1"],
        ["4 — Datos y Credito",    "24 — 48m",   "$130,000 - $570,000",   "Intereses desde mes 1"],
        ["5 — NeoBank",            "36 — 60m+",  "Segun ruta regulatoria","Todo lo anterior"],
        ["TOTAL FASES 1-4",        "0 — 48m",    "$309,000 - $1,034,800", "Multiple"],
    ],
    col_widths=[3.8*cm, 2.5*cm, 5*cm, 4.2*cm]
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# 10 — PROXIMOS PASOS
# ─────────────────────────────────────────────────────────────────────────────
story.append(section_header("10 — Proximos Pasos", "Acciones inmediatas — orden de prioridad y costo"))
story.append(sp(0.4))
story.append(p(
    "Las siguientes acciones pueden ejecutarse en paralelo. Se priorizan las de mayor "
    "impacto con menor costo. El primer mes cuesta menos de $2,000 y abre las puertas "
    "al ecosistema internacional completo."
))
story.append(sp(0.3))

blocks = [
    ("INMEDIATO — Esta semana (< $500)", ORANGE, [
        "Definir estructura accionaria de MediaNetPay International LLC (socios y porcentajes antes de constituir)",
        "Elegir servicio de constitucion LLC Delaware: Stripe Atlas ($500 todo incluido), Firstbase.io ($399), Northwest ($39 + $90 state fee)",
        "Abrir cuenta Mercury Bank USA en mercury.com — proceso 100% online, especialmente disenado para startups y fintechs",
        "Iniciar aplicacion en circle.com/circle-mint — gratuita, iniciar ya porque el proceso KYC toma semanas",
    ]),
    ("SEMANA 2-4 — Legal y Compliance ($5,000 - $12,000)", NAVY, [
        "Contratar estudio ecuatoriano para opinion legal escrita sobre operacion de stablecoins — presupuesto $5,000-$10,000",
        "Elaborar politicas internas AML/KYC para clientes crypto (requeridas por Circle Mint y Binance Institutional)",
        "Abrir cuenta institucional en Binance para acceso gradual al OTC desk",
        "Registrar EIN (Tax ID) de la LLC directamente con el IRS — gratuito, instrucciones en irs.gov/ein",
    ]),
    ("MES 1-3 — Producto y Liquidez ($30,000 - $60,000)", GREEN, [
        "Completar integracion API Circle Mint (USDC) en el backend de MediaNetPay",
        "Disenhar UX de compra/venta USDC dentro de BananaPay via WhatsApp (flujo conversacional)",
        "Fondear inventario inicial: $30,000-$50,000 USDC para fase piloto controlado",
        "Lanzar piloto cerrado con 100-200 usuarios seleccionados — medir frecuencia, monto promedio, NPS",
        "Iterar UX basado en feedback del piloto antes del lanzamiento publico",
    ]),
    ("MES 3-6 — Escala y Alianzas ($20,000 - $50,000)", BLUE, [
        "Lanzar publicamente el servicio de stablecoins en Ecuador con campana de posicionamiento",
        "Iniciar conversaciones con cooperativas ecuatorianas (COOPROGRESO, JEP, 29 de Octubre) para alianza de credito",
        "Construir dashboard interno de scoring crediticio con datos transaccionales acumulados",
        "Iniciar proceso de alianza bancaria para formalizacion del wallet BananaPay",
        "Evaluar ronda de inversion seed ($500K-$2M) para fondear fases 3 y 4 simultaneamente",
    ]),
]

for title, color, items in blocks:
    for elem in priority_block(title, color, items):
        story.append(elem)

story.append(sp(0.3))
story.append(info_box(
    "La ventaja de MediaNetPay no esta en ser el primero en Ecuador — esta en ser el "
    "mejor posicionado cuando el mercado madure. Ecuador dolarizado + WhatsApp como canal "
    "dominante + mercado informal masivo y desatendido = combinacion que ningun banco "
    "tradicional puede replicar con la agilidad de una empresa tecnologica. "
    "La escalera ya empezo. Cada paso que se da hoy es una barrera de entrada para "
    "cualquier competidor que llegue manana.",
    ORANGE, "La ventaja competitiva sostenible"
))

story.append(sp(0.5))

# Disclaimer
disc = Table([[Paragraph(
    "Documento preparado por MediaNetPay — Junio 2026. Los costos son estimaciones "
    "basadas en informacion publica y referencias de mercado latinoamericano. Este documento "
    "es confidencial y de uso interno exclusivo. Los analisis legales son orientativos — "
    "consulte con asesores legales y financieros certificados antes de tomar decisiones de inversion.",
    S["small"]
)]], colWidths=[INNER_W])
disc.setStyle(TableStyle([
    ("BACKGROUND",   (0, 0), (-1, -1), LIGHT),
    ("TOPPADDING",   (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ("LEFTPADDING",  (0, 0), (-1, -1), 14),
    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ("LINEABOVE",    (0, 0), (-1,  0), 1, colors.HexColor("#D1D5DB")),
]))
story.append(disc)

# ── Build ─────────────────────────────────────────────────────────────────────
doc.build(story)
print(f"PDF generado exitosamente: {OUTPUT}")
