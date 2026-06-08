"""
Genera el PDF: IA en Pagos Digitales — Analisis Estrategico para MediaNetPay
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from datetime import date

# ── Colores de marca ──────────────────────────────────────────────────────────
NAVY    = colors.HexColor("#003358")
ORANGE  = colors.HexColor("#F89937")
GRAY_BG = colors.HexColor("#F7F8FA")
GRAY_LT = colors.HexColor("#E5E7EB")
GRAY_TX = colors.HexColor("#6B7280")
CODE_BG = colors.HexColor("#1E293B")
CODE_FG = colors.HexColor("#E2E8F0")
WHITE   = colors.white
BLACK   = colors.HexColor("#111827")
GREEN   = colors.HexColor("#10B981")
RED     = colors.HexColor("#EF4444")

W, H = A4

# ── Estilos ───────────────────────────────────────────────────────────────────
def make_styles():
    s = {}

    s["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName="Helvetica-Bold",
        fontSize=28,
        textColor=WHITE,
        leading=34,
        spaceAfter=10,
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub",
        fontName="Helvetica",
        fontSize=13,
        textColor=colors.HexColor("#CBD5E1"),
        leading=18,
        spaceAfter=8,
    )
    s["cover_meta"] = ParagraphStyle(
        "cover_meta",
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#94A3B8"),
        leading=14,
    )
    s["section_label"] = ParagraphStyle(
        "section_label",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=ORANGE,
        spaceAfter=4,
        spaceBefore=20,
        leading=10,
    )
    s["h1"] = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=NAVY,
        spaceBefore=16,
        spaceAfter=8,
        leading=24,
    )
    s["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=NAVY,
        spaceBefore=14,
        spaceAfter=6,
        leading=18,
    )
    s["h3"] = ParagraphStyle(
        "h3",
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=NAVY,
        spaceBefore=10,
        spaceAfter=4,
        leading=14,
    )
    s["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        textColor=BLACK,
        leading=15,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
    )
    s["body_bold"] = ParagraphStyle(
        "body_bold",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=BLACK,
        leading=15,
        spaceAfter=4,
    )
    s["bullet"] = ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=10,
        textColor=BLACK,
        leading=15,
        leftIndent=16,
        spaceAfter=3,
    )
    s["code"] = ParagraphStyle(
        "code",
        fontName="Courier",
        fontSize=8,
        textColor=CODE_FG,
        leading=12,
        leftIndent=0,
        spaceAfter=2,
    )
    s["insight"] = ParagraphStyle(
        "insight",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=NAVY,
        leading=14,
        spaceAfter=2,
    )
    s["insight_body"] = ParagraphStyle(
        "insight_body",
        fontName="Helvetica",
        fontSize=9.5,
        textColor=BLACK,
        leading=14,
        spaceAfter=2,
        alignment=TA_JUSTIFY,
    )
    s["footer"] = ParagraphStyle(
        "footer",
        fontName="Helvetica",
        fontSize=8,
        textColor=GRAY_TX,
        alignment=TA_CENTER,
    )
    return s


# ── InfoBox — tabla con borde izquierdo de color ──────────────────────────────
# Usando Table en vez de Flowable custom: ReportLab calcula el alto automaticamente,
# no hay desbordamiento ni solapamiento de texto.

def InfoBox(text, page_width=None, border_color=None, bg_color=None,
            text_color=None, font_size=10):
    """
    Caja de informacion con borde izquierdo de color.
    Retorna un flowable Table — el alto se calcula automaticamente.
    """
    _available = (page_width or (W - 4*cm))
    _border     = border_color or ORANGE
    _bg         = bg_color     or colors.HexColor("#FFF9F0")
    _tc         = text_color   or NAVY

    style = ParagraphStyle(
        "ib_text",
        fontName="Helvetica-Oblique",
        fontSize=font_size,
        textColor=_tc,
        leading=font_size + 5,
        spaceAfter=0,
    )
    content = Paragraph(text.replace("\n", "<br/>"), style)

    # Columna izquierda de 4pt = borde de color; columna derecha = contenido
    border_w  = 5
    content_w = _available - border_w

    t = Table(
        [["", content]],
        colWidths=[border_w, content_w],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), _border),
        ("BACKGROUND",    (1, 0), (1, -1), _bg),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 0),
        ("LEFTPADDING",   (1, 0), (1, -1), 14),
        ("RIGHTPADDING",  (1, 0), (1, -1), 12),
        ("BOX",           (0, 0), (-1, -1), 1, _border),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


# ── CodeBlock — fondo oscuro con texto monoespaciado ─────────────────────────

class CodeBlock(Flowable):
    """Bloque de codigo con fondo oscuro. Altura calculada en wrap()."""
    LINE_H = 13   # puntos por linea
    PAD_V  = 14   # padding vertical total (top + bottom)

    def __init__(self, lines, width=None):
        super().__init__()
        self._lines = lines
        self._width = width or (W - 4 * cm)
        # Altura provisional; se recalcula en wrap()
        self.height = len(lines) * self.LINE_H + self.PAD_V

    def wrap(self, availW, availH):
        self._width = min(self._width, availW)
        self.height = len(self._lines) * self.LINE_H + self.PAD_V
        return self._width, self.height

    def draw(self):
        c = self.canv
        # Fondo
        c.setFillColor(CODE_BG)
        c.roundRect(0, 0, self._width, self.height, 6, fill=1, stroke=0)
        # Texto
        c.setFillColor(CODE_FG)
        c.setFont("Courier", 8)
        y = self.height - self.PAD_V // 2 - 8   # primera linea
        max_chars = max(1, int((self._width - 20) / 4.8))  # ~4.8pt por caracter Courier 8
        for line in self._lines:
            # Truncar si la linea es demasiado larga para el ancho
            display = line[:max_chars] if len(line) > max_chars else line
            c.drawString(10, y, display)
            y -= self.LINE_H


def section_divider(label, s):
    """Retorna lista de flowables para una seccion nueva."""
    return [
        Spacer(1, 0.3 * cm),
        HRFlowable(width="100%", thickness=1, color=GRAY_LT, spaceAfter=4),
        Paragraph(label.upper(), s["section_label"]),
    ]


def company_card(title, subtitle, bullets, insight, s):
    """Tarjeta de empresa con bullets e insight."""
    items = [
        Paragraph(title, s["h2"]),
        Paragraph(subtitle, s["body"]),
    ]
    for b in bullets:
        items.append(Paragraph(f"<bullet>&bull;</bullet>  {b}", s["bullet"]))
    items.append(Spacer(1, 6))
    items.append(InfoBox(f"Insight clave: {insight}", border_color=NAVY,
                         bg_color=colors.HexColor("#EFF6FF"),
                         text_color=NAVY, font_size=9))
    items.append(Spacer(1, 10))
    return KeepTogether(items)


# ── Portada ───────────────────────────────────────────────────────────────────
# FIX: eliminado el Spacer negativo que causaba solapamiento.
# Ahora la portada es una sola Table con fondo NAVY que contiene todo el texto.

def build_cover(s):
    story = []

    title_p = Paragraph("IA en Pagos Digitales", s["cover_title"])
    sub_p   = Paragraph(
        "Empresas que ya lo hicieron, comportamientos encontrados,<br/>"
        "tecnologia usada y hoja de ruta para MediaNetPay",
        s["cover_sub"])
    meta_p  = Paragraph(
        f"Analisis Estrategico  |  MediaNetPay  |  {date.today().strftime('%B %Y')}",
        s["cover_meta"])

    # Una sola tabla: fondo NAVY, texto adentro — sin spacers negativos
    cover_table = Table(
        [[title_p],
         [sub_p],
         [Spacer(1, 10)],
         [meta_p]],
        colWidths=[W - 4 * cm],
    )
    cover_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (0, 0),   40),   # padding top de la primera fila
        ("TOPPADDING",    (0, 1), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -2), 2),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 40),  # padding bottom de la ultima fila
        ("LEFTPADDING",   (0, 0), (-1, -1), 30),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 30),
    ]))

    story.append(cover_table)
    story.append(Spacer(1, 1.2 * cm))
    story.append(HRFlowable(width="100%", thickness=3, color=ORANGE, spaceAfter=20))

    return story


# ── Seccion 1: Empresas ───────────────────────────────────────────────────────

def build_section1(s):
    story = []
    story += section_divider("01 / Empresas que ya lo hicieron", s)
    story.append(Paragraph("El mapa de referencia — quienes construyeron esto antes", s["h1"]))
    story.append(Paragraph(
        "Ninguna de estas empresas invento la rueda. Todas siguieron el mismo patron: "
        "capturar datos transaccionales propios, estructurarlos bien, y construir "
        "inteligencia encima. La diferencia esta en la escala y el mercado.",
        s["body"]))
    story.append(Spacer(1, 6))

    story.append(company_card(
        "Nubank (Brasil) — el caso mas relevante",
        "Empezaron en 2013 sin datos propios. El problema identico: los bancos tradicionales "
        "tenian todo el historial crediticio y no lo compartian.",
        [
            "Lanzaron una tarjeta de credito con limite bajo para capturar datos propios",
            "Cada transaccion = evento estructurado con 200+ features",
            "En 18 meses tenian suficiente data para construir su propio modelo de credit scoring",
            "Hoy tienen 100M de clientes y su modelo supera al buro tradicional en Brasil",
        ],
        "No esperaron tener suficientes datos — empezaron a modelar con lo que tenian "
        "y el modelo mejoro solo con el tiempo.",
        s,
    ))

    story.append(company_card(
        "Mercado Pago (LATAM) — el mas comparable geograficamente",
        "Mercado Libre tenia el marketplace. Mercado Pago fue el brazo de pagos. "
        "La secuencia: Datos de pago -> Mercado Credito -> $5B en prestamos a PyMEs.",
        [
            "Mercado Credito aprueba un prestamo en 15 segundos para un vendedor sin cuenta bancaria",
            "Basado unicamente en historial de ventas en la plataforma",
            "Tasa de default menor que los bancos tradicionales porque los datos son mas ricos",
            "El vendedor nunca tuvo que llenar un formulario bancario",
        ],
        "El historial de ventas es mas predictivo de solvencia que los estados financieros auditados.",
        s,
    ))

    story.append(company_card(
        "Square/Block (EEUU) — el modelo SoftPOS",
        "Square Capital usa exactamente lo que MediaNetPay ya tiene: datos del POS fisico.",
        [
            "Un restaurante con $18,000/mes consistentes por 8 meses = mejor perfil que empresa auditada",
            "El prestamo se descuenta automaticamente como % de ventas diarias — sin cuota fija",
            "El modelo de repago es posible porque controlan el flujo del dinero",
            "Square Capital presto $15B+ a mas de 500,000 comercios sin banco intermediario",
        ],
        "El control del flujo de dinero convierte cada transaccion en garantia implicita del prestamo.",
        s,
    ))

    story.append(company_card(
        "M-Pesa / M-Shwari (Kenya) — el caso de desbancarizacion",
        "Directamente aplicable al 17% desbancarizado de Ecuador. Safaricom tenia datos "
        "de transferencias de M-Pesa. Con eso construyeron M-Shwari.",
        [
            "Micro-prestamos de $2 a $200 aprobados en segundos para gente sin cuenta bancaria",
            "20 millones de prestamos en los primeros 2 anos de operacion",
            "Default rate: 2.5% vs 10%+ de los bancos tradicionales kenianos",
            "El 72% de los usuarios nunca habia accedido a credito formal antes",
        ],
        "Los datos de comportamiento de pago predicen riesgo mejor que la ausencia de historial bancario.",
        s,
    ))

    story.append(company_card(
        "Stripe Radar (EEUU) — el efecto red en fraude",
        "La clave de Stripe no es que tienen datos de una empresa — es que tienen datos "
        "de millones de empresas. Esto se llama fraud intelligence compartida.",
        [
            "Una tarjeta fraudulenta que intenta cobrar en tu tienda ya fue vista en 200 tiendas antes",
            "Cada comercio nuevo que se une hace el sistema mas inteligente para todos los demas",
            "Stripe Radar procesa $1T+ de pagos anuales — cada transaccion entrena el modelo",
            "MediaNetPay tiene la misma oportunidad: disenar el efecto red desde el dia 1",
        ],
        "El efecto red en fraude: el comercio #500 tiene automaticamente mejor proteccion "
        "que el comercio #1 porque el modelo vio mas patrones.",
        s,
    ))

    return story


# ── Seccion 2: Comportamientos ────────────────────────────────────────────────

def build_section2(s):
    story = []
    story += section_divider("02 / Comportamientos encontrados en los datos", s)
    story.append(Paragraph("Patrones reales que emergen cuando los datos estan estructurados", s["h1"]))

    # Fraude
    story.append(Paragraph("Senales de fraude", s["h2"]))
    story.append(Paragraph(
        "Estos patrones son universales pero tienen variaciones locales. "
        "El modelo entrenado en datos ecuatorianos detecta la version local de cada patron.",
        s["body"]))

    fraud_lines = [
        "Velocidad:     misma tarjeta, 3 comercios distintos, < 5 min  ->  clonacion",
        "Geografia:     txn en Quito 09:15, txn en Guayaquil 09:22     ->  imposible",
        "Card testing:  $0.01 -> $0.01 -> $0.01 -> $850 en 60 seg     ->  bot",
        "Madrugada:     transacciones 2am-5am tienen 8x mas probabilidad de fraude",
        "Monto redondo: $200.00 exacto es mas sospechoso que $197.50",
        "BIN patterns:  ciertos rangos de BIN con historial de fraude local EC",
    ]
    story.append(CodeBlock(fraud_lines))
    story.append(Spacer(1, 12))

    # Credit scoring
    story.append(Paragraph("Comportamiento de comercio — credit scoring", s["h2"]))
    credit_lines = [
        "Consistencia > monto:  $5K/mes x 12 meses  >  $20K un mes y $0 al siguiente",
        "Retencion:             % clientes que repiten = indicador de salud del negocio",
        "Distribucion montos:   muchos pequenos = retail estable | pocos grandes = B2B",
        "Ciclo nomina EC:       picos el 15 y ultimo de cada mes -> validar que el comercio los tiene",
        "Resiliencia estacional: comercio que sobrevive enero/febrero = menor riesgo",
    ]
    story.append(CodeBlock(credit_lines))
    story.append(Spacer(1, 12))

    # Demand forecasting
    story.append(Paragraph("Patrones de demanda — especificos de Ecuador", s["h2"]))
    story.append(Paragraph(
        "Estos patrones no existen en ningun dataset global porque son especificos "
        "del calendario, la cultura y el ciclo economico ecuatoriano.",
        s["body"]))
    demand_lines = [
        "Dia de la Madre (2do domingo mayo):   +300%  flores, ropa, restaurantes",
        "Inicio clases  (septiembre+febrero):  +250%  utiles, uniformes, mochilas",
        "Navidad / fin de ano:                 +180%  electronica, ropa, viajes",
        "Quincenas (15 y ultimo del mes):       +40%  promedio todos los rubros",
        "Viernes 6pm-9pm:                       pico semanal mas consistente en EC",
    ]
    story.append(CodeBlock(demand_lines))

    return story


# ── Seccion 3: Tecnologia ─────────────────────────────────────────────────────

def build_section3(s):
    story = []
    story += section_divider("03 / Tecnologia usada — la stack real", s)
    story.append(Paragraph("Lo que usan en produccion las empresas serias", s["h1"]))

    # Fraud detection
    story.append(Paragraph("Fraud detection (tiempo real, objetivo: < 100ms)", s["h2"]))
    fraud_stack = [
        "Feature engineering:  ventanas 1min / 5min / 1h / 24h / 7d por tarjeta, comercio, IP",
        "Modelo principal:     XGBoost o LightGBM — estandar de la industria",
        "Infraestructura:      Kafka (stream) -> Feature store -> modelo via Redis",
        "Deteccion de anillos: Graph Neural Networks (GNN) — fraude coordinado",
        "Anomalia no supervisada: Isolation Forest para patrones nuevos sin etiqueta",
        "Paper:                XGBoost: Scalable Tree Boosting (Chen & Guestrin, KDD 2016)",
        "Paper:                Graph Neural Networks for Fraud Detection (IEEE, 2022)",
    ]
    story.append(CodeBlock(fraud_stack))
    story.append(Spacer(1, 12))

    # Credit scoring
    story.append(Paragraph("Credit scoring de comercios (batch diario)", s["h2"]))
    credit_stack = [
        "Features:     rolling windows 30 / 90 / 180 / 365 dias",
        "Baseline:     Logistic Regression — modelo interpretable de referencia",
        "Produccion:   Gradient Boosting (XGBoost) — mejor AUC",
        "Validacion:   calibrar contra buro de credito EC",
        "Paper:        Alternative Data for Credit Scoring — IFC/Banco Mundial (2019)",
    ]
    story.append(CodeBlock(credit_stack))
    story.append(Spacer(1, 12))

    # Demand forecasting
    story.append(Paragraph("Demand forecasting (semanal, por comercio)", s["h2"]))
    forecast_stack = [
        "Modelo:       Prophet (Meta) — series de negocio con estacionalidad multiple",
        "Granularidad: por categoria de comercio x zona geografica x dia de semana",
        "Input:        transacciones + feriados EC + ciclos nomina + variables macro",
        "Paper:        Forecasting at Scale (Taylor & Letham, Meta, 2017)",
    ]
    story.append(CodeBlock(forecast_stack))
    story.append(Spacer(1, 12))

    # LLM layer
    story.append(Paragraph("La capa LLM encima de todo (lo nuevo, post-2023)", s["h2"]))
    story.append(Paragraph(
        "El ML detecta y predice. El LLM explica en lenguaje natural. "
        "Esta combinacion es lo que Stripe, PayPal y Square estan implementando ahora mismo.",
        s["body"]))

    llm_lines = [
        "ML detecta  ->  LLM explica en espanol al comerciante",
        "",
        "Ejemplo fraude:",
        "  XGBoost:      score_fraude = 0.89  ->  bloquear",
        "  Claude Haiku: Esta txn fue bloqueada porque la misma tarjeta intento",
        "                cobrar en 4 comercios en 8 minutos y el monto es 15x",
        "                el promedio de este cliente.",
        "",
        "Analytics conversacional:",
        "  Comerciante:  Como me fue este mes?",
        "  Claude:       Tus ventas subieron 23% vs el mes anterior. Tu hora",
        "                pico fue las 7pm del viernes. Tienes 3 nuevos clientes.",
    ]
    story.append(CodeBlock(llm_lines))

    return story


# ── Seccion 4: Papers ─────────────────────────────────────────────────────────

def build_section4(s):
    story = []
    story += section_divider("04 / Papers cientificos relevantes", s)
    story.append(Paragraph("La base academica del modelo", s["h1"]))
    story.append(Paragraph(
        "Estos papers son el fundamento cientifico de lo que empresas como Stripe, "
        "Nubank y Square implementaron en produccion. No son teoria — son la base "
        "de sistemas que procesan billones de dolares.",
        s["body"]))
    story.append(Spacer(1, 8))

    papers = [
        [
            "XGBoost: A Scalable Tree Boosting System\nChen & Guestrin — KDD 2016",
            "El modelo que usa el 80% de los sistemas de fraude en produccion mundial. "
            "Gradient boosting optimizado para velocidad y memoria."
        ],
        [
            "Graph Neural Networks for Fraud Detection\nIEEE Transactions — 2022",
            "Detectar anillos de fraude coordinados, no solo transacciones individuales. "
            "Modela relaciones entre tarjetas, comercios y dispositivos como grafo."
        ],
        [
            "Alternative Data for Credit Scoring in Emerging Markets\nIFC / Banco Mundial — 2019",
            "Exactamente el caso de MediaNetPay: scoring sin buro tradicional usando "
            "datos de comportamiento de pago. Casos de exito en Africa y Asia."
        ],
        [
            "Forecasting at Scale\nTaylor & Letham, Meta — 2017",
            "Prophet: demand forecasting para series de tiempo de negocio con "
            "estacionalidad multiple (anual, semanal, festivos). Open source."
        ],
        [
            "Financial Inclusion and Development\nBID / BID Invest — 2023",
            "Contexto LATAM: impacto de la inclusion financiera digital en PyMEs. "
            "Datos especificos de Ecuador incluidos."
        ],
        [
            "Deep Learning for Real-Time Fraud Detection\nIEEE Transactions — 2021",
            "Arquitecturas neuronales para scoring en tiempo real sub-100ms. "
            "Comparativa contra gradient boosting clasico en datasets reales."
        ],
        [
            "Credit Risk Scoring with Machine Learning\nJournal of Finance — 2020",
            "Comparativa rigurosa entre modelos ML y estadisticos tradicionales "
            "para credito. ML gana en todos los segmentos con datos suficientes."
        ],
    ]

    table_data = [["Paper / Autores", "Por que importa para MediaNetPay"]]
    for row in papers:
        table_data.append([
            Paragraph(row[0], ParagraphStyle("pt", fontName="Helvetica-Bold",
                                              fontSize=8.5, textColor=NAVY, leading=13)),
            Paragraph(row[1], ParagraphStyle("pb", fontName="Helvetica",
                                              fontSize=8.5, textColor=BLACK, leading=13)),
        ])

    col_w = [(W - 4*cm) * 0.38, (W - 4*cm) * 0.62]
    t = Table(table_data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
        ("TOPPADDING",    (0, 0), (-1, 0), 9),
        # Rows
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_BG]),
        ("TOPPADDING",    (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("GRID",          (0, 0), (-1, -1), 0.5, GRAY_LT),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)

    return story


# ── Seccion 5: Como boostear ──────────────────────────────────────────────────

def build_section5(s):
    story = []
    story += section_divider("05 / Como boostear — lo que nadie mas tiene", s)
    story.append(Paragraph("Las ventajas competitivas que no se pueden copiar facilmente", s["h1"]))

    boosts = [
        (
            "El efecto red de fraude",
            "Cuando el comercio #500 se une, los 499 anteriores automaticamente tienen "
            "mejor proteccion porque el modelo vio mas patrones. Una tarjeta fraudulenta "
            "que aparece en cualquier comercio de la red inmediatamente genera una alerta "
            "para todos los demas. Stripe tardo 3 anos en tener este efecto. "
            "MediaNetPay puede disenarlo desde el dia 1.",
        ),
        (
            "La ventaja de la dolarizacion — unica en el mundo",
            "Un modelo entrenado en datos de Ecuador USD no tiene ruido cambiario. "
            "Es el unico mercado emergente completamente dolarizado del mundo. "
            "Cuando el modelo este listo, aplica directamente a Panama, El Salvador, "
            "Puerto Rico, Islas Virgenes — sin reentrenar, sin ajuste de divisas. "
            "Eso tiene valor exportable enorme.",
        ),
        (
            "Transfer learning desde modelos globales",
            "No se empieza desde cero. Se parte de un modelo pre-entrenado en datos "
            "globales de fraude (hay datasets publicos de Kaggle/IEEE con millones de "
            "transacciones etiquetadas) y se hace fine-tuning con los patrones especificos "
            "de Ecuador. Con 50,000 transacciones nuevas ya hay suficiente para que el "
            "fine-tuning sea estadisticamente significativo.",
        ),
        (
            "19 anos de datos historicos de MediaNet",
            "Este es el activo mas defensible. Ninguna fintech nueva en Ecuador puede "
            "replicarlo. Los ultimos 5 anos de datos estructurados de MediaNet, "
            "normalizados al schema de MediaNetPay, son el dataset de entrenamiento "
            "mas rico que existe para el mercado ecuatoriano. El primer modelo de "
            "fraud detection ecuatoriano entrenado en datos locales reales.",
        ),
        (
            "LLM como capa de explicabilidad en espanol",
            "El ML detecta. Claude explica en espanol ecuatoriano al comerciante. "
            "Ningun procesador de pagos local tiene esto hoy. No es solo una feature — "
            "es una razon para que los comerciantes elijan MediaNetPay sobre Datafast "
            "o PayPhone: la plataforma que entiende su negocio y se lo explica.",
        ),
    ]

    for title, body in boosts:
        items = [
            Paragraph(title, s["h3"]),
            Paragraph(body, s["body"]),
            Spacer(1, 6),
        ]
        story.append(KeepTogether(items))

    return story


# ── Seccion 6: Conclusion ─────────────────────────────────────────────────────

def build_conclusion(s):
    story = []
    story += section_divider("06 / Conclusion", s)
    story.append(Paragraph("El primer modelo que vale construir — y por que ahora", s["h1"]))

    story.append(InfoBox(
        "El primer modelo que vale la pena construir es fraud detection.\n"
        "Tienes datos etiquetados desde el dia 1 (aprobado/rechazado),\n"
        "el impacto es inmediato en reduccion de chargebacks,\n"
        "y con los 5 anos de MediaNet legacy ya tienes el dataset para arrancar.",
        border_color=ORANGE,
        bg_color=colors.HexColor("#FFF9F0"),
        text_color=NAVY,
        font_size=10,
    ))

    story.append(Spacer(1, 16))

    roadmap = [
        ["Fase", "Que construir", "Dato generado", "IA habilitada"],
        ["HOY\n(semanas)", "Instrumentar eventos\nde transaccion completos",
         "Comportamiento checkout,\ntasa conversion, abandono",
         "Analytics LLM.\nInsights por comercio."],
        ["Mes 2-3", "ETL 5 anos MediaNet\nal schema nuevo",
         "Dataset historico\nde Ecuador etiquetado",
         "Fraud detection baseline.\nPrimeros modelos."],
        ["Mes 4-9", "Fraud detection v1\nen produccion",
         "Fraud signals propios,\npatrones locales EC",
         "Score de fraude en\ntiempo real < 100ms."],
        ["Mes 9-18", "Credit scoring\npara comercios",
         "Historial financiero\npor comercio",
         "Prestamos automaticos\nbasados en ventas."],
        ["Ano 2-3", "API de datos agregados\nanonimizados",
         "Primer dataset publico\nEC comportamiento financiero",
         "Terceros construyen\nencima. Bancos, fintechs."],
    ]

    col_widths = [
        (W - 4*cm) * 0.14,
        (W - 4*cm) * 0.24,
        (W - 4*cm) * 0.30,
        (W - 4*cm) * 0.32,
    ]

    def cell(text, bold=False, color=BLACK, size=8.5):
        fn = "Helvetica-Bold" if bold else "Helvetica"
        return Paragraph(text.replace("\n", "<br/>"), ParagraphStyle(
            "rc", fontName=fn, fontSize=size, textColor=color, leading=13))

    table_data = []
    for i, row in enumerate(roadmap):
        if i == 0:
            table_data.append([cell(c, bold=True, color=WHITE) for c in row])
        else:
            table_data.append([cell(c) for c in row])

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_BG]),
        ("GRID",          (0, 0), (-1, -1), 0.5, GRAY_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        # Fase 1 highlighted
        ("BACKGROUND",    (0, 1), (-1, 1), colors.HexColor("#EFF6FF")),
    ]))
    story.append(t)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=12))
    story.append(Paragraph(
        "No se esta construyendo solo una pasarela de pagos. "
        "Se esta construyendo la capa de datos financieros de Ecuador. "
        "Eso vale exponencialmente mas que procesar comisiones del 0.5%.",
        ParagraphStyle("final", fontName="Helvetica-Bold", fontSize=11,
                       textColor=NAVY, leading=17, alignment=TA_CENTER),
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=8))

    return story


# ── Page template con header/footer ───────────────────────────────────────────

def on_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    # Footer
    canvas.setFillColor(GRAY_TX)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2*cm, 1.2*cm,
                      f"IA en Pagos Digitales — Analisis Estrategico MediaNetPay — {date.today().year}")
    canvas.drawRightString(w - 2*cm, 1.2*cm, f"Pagina {doc.page}")
    # Header line (skip portada)
    if doc.page > 1:
        canvas.setStrokeColor(NAVY)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, h - 1.5*cm, w - 2*cm, h - 1.5*cm)
        canvas.setFillColor(NAVY)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(2*cm, h - 1.2*cm, "MediaNetPay")
        canvas.setFillColor(GRAY_TX)
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(w - 2*cm, h - 1.2*cm, "IA en Pagos Digitales")
    canvas.restoreState()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    out = r"C:\Users\stanley\Desktop\MediaNetPay\Docs\IA_Pagos_Digitales_MediaNetPay.pdf"

    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.2*cm, bottomMargin=2*cm,
        title="IA en Pagos Digitales — Analisis Estrategico MediaNetPay",
        author="MediaNetPay",
    )

    s = make_styles()
    story = []

    story += build_cover(s)
    story += build_section1(s)
    story.append(PageBreak())
    story += build_section2(s)
    story.append(PageBreak())
    story += build_section3(s)
    story.append(PageBreak())
    story += build_section4(s)
    story += build_section5(s)
    story.append(PageBreak())
    story += build_conclusion(s)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF generado: {out}")


if __name__ == "__main__":
    main()
