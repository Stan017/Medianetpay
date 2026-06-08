"""
Genera el PDF: Widget JS y Plugins de Integracion — MediaNetPay
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable

# ── Colores corporativos ───────────────────────────────────────────────────────
NAVY      = colors.HexColor("#003358")
BLUE      = colors.HexColor("#0050cb")
ORANGE    = colors.HexColor("#F89937")
LIGHT_BG  = colors.HexColor("#f2f3ff")
BORDER    = colors.HexColor("#c2c6d8")
GREEN     = colors.HexColor("#16a34a")
RED       = colors.HexColor("#dc2626")
GRAY      = colors.HexColor("#6b7280")
DARK      = colors.HexColor("#131b2e")
WHITE     = colors.white
CODE_BG   = colors.HexColor("#0d1117")
CODE_TEXT = colors.HexColor("#e6edf3")

W, H = A4

# ── Estilos ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def style(name, **kw):
    return ParagraphStyle(name, **kw)

S_TITLE = style("s_title",
    fontName="Helvetica-Bold", fontSize=28, textColor=NAVY,
    spaceAfter=4, leading=34)

S_SUBTITLE = style("s_subtitle",
    fontName="Helvetica", fontSize=14, textColor=GRAY,
    spaceAfter=20, leading=20)

S_H1 = style("s_h1",
    fontName="Helvetica-Bold", fontSize=16, textColor=NAVY,
    spaceBefore=18, spaceAfter=8, leading=20)

S_H2 = style("s_h2",
    fontName="Helvetica-Bold", fontSize=13, textColor=BLUE,
    spaceBefore=14, spaceAfter=6, leading=16)

S_H3 = style("s_h3",
    fontName="Helvetica-Bold", fontSize=11, textColor=DARK,
    spaceBefore=10, spaceAfter=4, leading=14)

S_BODY = style("s_body",
    fontName="Helvetica", fontSize=10, textColor=DARK,
    spaceAfter=6, leading=15, alignment=TA_JUSTIFY)

S_BODY_C = style("s_body_c",
    fontName="Helvetica", fontSize=10, textColor=DARK,
    spaceAfter=4, leading=14, alignment=TA_CENTER)

S_BULLET = style("s_bullet",
    fontName="Helvetica", fontSize=10, textColor=DARK,
    spaceAfter=4, leading=14, leftIndent=16,
    bulletIndent=4, alignment=TA_LEFT)

S_CODE = style("s_code",
    fontName="Courier", fontSize=9, textColor=CODE_TEXT,
    backColor=CODE_BG, spaceAfter=8, leading=13,
    leftIndent=8, rightIndent=8)

S_CAPTION = style("s_caption",
    fontName="Helvetica-Oblique", fontSize=9, textColor=GRAY,
    spaceAfter=8, leading=12, alignment=TA_CENTER)

S_TAG = style("s_tag",
    fontName="Helvetica-Bold", fontSize=8, textColor=WHITE,
    alignment=TA_CENTER)

S_FOOTER = style("s_footer",
    fontName="Helvetica", fontSize=8, textColor=GRAY,
    alignment=TA_CENTER)


def hr(color=BORDER, thickness=0.5, spaceB=6, spaceA=6):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=spaceA, spaceBefore=spaceB)


def badge(text, bg=BLUE, fg=WHITE, width=90):
    """Tabla de una celda que actua como badge."""
    data = [[Paragraph(f"<b>{text}</b>", ParagraphStyle("b",
        fontName="Helvetica-Bold", fontSize=9, textColor=fg,
        alignment=TA_CENTER))]]
    t = Table(data, colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    return t


def info_box(text, bg=LIGHT_BG, border=BLUE, icon="ℹ"):
    data = [[Paragraph(f"<b>{icon}</b>",
                ParagraphStyle("ib", fontName="Helvetica-Bold", fontSize=12,
                               textColor=border, alignment=TA_CENTER)),
             Paragraph(text, ParagraphStyle("ibt", fontName="Helvetica",
                               fontSize=10, textColor=DARK, leading=14))]]
    t = Table(data, colWidths=[18*mm, 140*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("BOX", (0,0), (-1,-1), 1, border),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t


def section_header(title, color=NAVY):
    """Franja de color con titulo de seccion."""
    data = [[Paragraph(f"<b>{title}</b>",
                ParagraphStyle("sh", fontName="Helvetica-Bold", fontSize=13,
                               textColor=WHITE))]]
    t = Table(data, colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
    ]))
    return t


# ── Header / Footer ────────────────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, H - 18*mm, W, 18*mm, fill=1, stroke=0)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, H - 18*mm, 6*mm, 18*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(14*mm, H - 12*mm, "MediaNetPay")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(W - 12*mm, H - 12*mm,
        "Widget JS & Plugins de Integracion")
    # Footer
    canvas.setFillColor(BORDER)
    canvas.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W/2, 3.5*mm,
        f"MediaNetPay — Documentacion Tecnica — Pagina {doc.page}")
    canvas.restoreState()


def on_first_page(canvas, doc):
    canvas.saveState()
    # Hero background
    canvas.setFillColor(NAVY)
    canvas.rect(0, H - 90*mm, W, 90*mm, fill=1, stroke=0)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, H - 90*mm, 8*mm, 90*mm, fill=1, stroke=0)
    # Autor en esquina superior derecha del hero
    canvas.setFillColor(colors.HexColor("#a5d6ff"))
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(W - 14*mm, H - 8*mm,
        "Desarrollado por Stanley Llaguno — devopstanley@gmail.com")
    # Footer
    canvas.setFillColor(BORDER)
    canvas.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W/2, 3.5*mm,
        "MediaNetPay — Documentacion Tecnica — Pagina 1")
    canvas.restoreState()


# ── Contenido ──────────────────────────────────────────────────────────────────
def build():
    out = r"C:\Users\stanley\Desktop\MediaNetPay\Docs\Widget_JS_y_Plugins_MediaNetPay.pdf"

    import os
    os.makedirs(r"C:\Users\stanley\Desktop\MediaNetPay\Docs", exist_ok=True)

    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=26*mm, bottomMargin=18*mm,
    )

    story = []

    # ── PORTADA ────────────────────────────────────────────────────────────────
    story += [
        Spacer(1, 30*mm),
        Paragraph("<font color='#F89937'><b>Media</b></font>"
                  "<font color='#ffffff'><b>net</b></font>"
                  "<font color='#F89937'><b>Pay</b></font>",
            ParagraphStyle("cover_logo", fontName="Helvetica-Bold",
                           fontSize=36, textColor=WHITE, leading=40)),
        Spacer(1, 6*mm),
        Paragraph("Widget JS &amp; Plugins de Integracion",
            ParagraphStyle("cover_title", fontName="Helvetica-Bold",
                           fontSize=22, textColor=WHITE, leading=28)),
        Spacer(1, 3*mm),
        Paragraph("Por que integrar el Widget JS en tu plataforma "
                  "y como los plugins de MediaNetPay agregan valor "
                  "al ecosistema de comercios ecuatorianos.",
            ParagraphStyle("cover_sub", fontName="Helvetica",
                           fontSize=12, textColor=colors.HexColor("#a5d6ff"),
                           leading=17)),
        Spacer(1, 48*mm),
        Paragraph("Documentacion Tecnica — Junio 2026",
            ParagraphStyle("cover_date", fontName="Helvetica",
                           fontSize=10, textColor=GRAY)),
        Spacer(1, 2*mm),
        Paragraph("Confidencial — Solo para uso interno y socios MediaNet",
            ParagraphStyle("cover_conf", fontName="Helvetica-Oblique",
                           fontSize=9, textColor=GRAY)),
        PageBreak(),
    ]

    # ── INDICE ─────────────────────────────────────────────────────────────────
    story += [
        Paragraph("Contenido", S_H1),
        hr(ORANGE, 2),
        Spacer(1, 4*mm),
    ]
    toc_items = [
        ("1.", "El ecosistema MediaNetPay",           "3"),
        ("2.", "Que es el Widget JS",                 "3"),
        ("3.", "Por que integrar el Widget JS",       "4"),
        ("4.", "Flujo de pago con Widget JS",         "5"),
        ("5.", "Los 5 Plugins de Integracion",        "6"),
        ("6.", "Comparativa: con y sin Widget",       "7"),
        ("7.", "Valor para el ecosistema MediaNet",   "8"),
        ("8.", "Proximos pasos",                      "8"),
    ]
    toc_data = [[
        Paragraph(f"<b>{n}</b>", ParagraphStyle("tn", fontName="Helvetica-Bold",
                  fontSize=10, textColor=BLUE)),
        Paragraph(t, ParagraphStyle("tt", fontName="Helvetica",
                  fontSize=10, textColor=DARK)),
        Paragraph(p, ParagraphStyle("tp", fontName="Helvetica",
                  fontSize=10, textColor=GRAY, alignment=TA_CENTER)),
    ] for n, t, p in toc_items]

    toc_table = Table(toc_data, colWidths=[12*mm, 140*mm, 18*mm])
    toc_table.setStyle(TableStyle([
        ("LINEBELOW", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story += [toc_table, PageBreak()]

    # ── 1. ECOSISTEMA ──────────────────────────────────────────────────────────
    story += [
        section_header("1. El ecosistema MediaNetPay"),
        Spacer(1, 4*mm),
        Paragraph(
            "MediaNetPay es una plataforma de pagos digitales que opera dentro del ecosistema "
            "de MediaNet — el procesador de pagos lider en Ecuador. Mientras MediaNet gestiona "
            "el procesamiento real de tarjetas (Visa, Mastercard, UnionPay) con certificacion "
            "PCI DSS, MediaNetPay agrega una capa de valor sobre ese procesamiento:",
            S_BODY),
        Spacer(1, 3*mm),
    ]

    eco_data = [
        ["Capa", "Responsabilidad", "Quien"],
        ["Procesamiento", "Autoriza tarjetas, conecta con bancos", "MediaNet"],
        ["Plataforma", "Portal, analytics, links de cobro, webhooks", "MediaNetPay"],
        ["Integracion", "Plugins, Widget JS, API documentada", "MediaNetPay"],
        ["Comercio", "Tienda online, CMS, sistema propio", "El cliente"],
    ]
    eco_table = Table(eco_data, colWidths=[38*mm, 92*mm, 40*mm])
    eco_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BACKGROUND", (2,2), (2,4), colors.HexColor("#eff6ff")),
        ("TEXTCOLOR", (2,2), (2,4), BLUE),
        ("FONTNAME", (2,2), (2,4), "Helvetica-Bold"),
    ]))
    story += [eco_table, Spacer(1, 4*mm),
        info_box(
            "Los comercios que ya usan MediaNet pueden integrar MediaNetPay "
            "sin cambiar su procesador de pagos. Siguen usando sus credenciales "
            "de MediaNet — MediaNetPay les da el portal, los plugins y las herramientas "
            "que MediaNet no ofrece directamente.",
            bg=colors.HexColor("#eff6ff"), border=BLUE, icon="i"),
    ]

    # ── 2. QUE ES EL WIDGET JS ────────────────────────────────────────────────
    story += [
        Spacer(1, 6*mm),
        section_header("2. Que es el Widget JS"),
        Spacer(1, 4*mm),
        Paragraph(
            "El Widget JS es un archivo JavaScript liviano (~90 lineas, sin dependencias) "
            "que los comercios incluyen en su sitio web con una sola linea de codigo. "
            "Permite iniciar un pago sin redirigir al cliente fuera del sitio del comercio.",
            S_BODY),
        Spacer(1, 3*mm),
        Paragraph("Como se usa (desde el sitio del comercio):", S_H3),
    ]

    code1 = """\
<!-- 1. Incluir el script una sola vez -->
<script src="https://api.medianetpay.ec/static/widget.js"></script>

<!-- 2. Boton de pago -->
<button onclick="MediaNetPay.open({
  token:     'tok_abc123',
  onSuccess: function(txn) { console.log('Pago OK', txn.transaction_id); },
  onClose:   function()    { console.log('Cliente cerro el modal'); }
})">
  Pagar $25.00
</button>"""

    story += [
        Table([[Paragraph(code1,
            ParagraphStyle("code", fontName="Courier", fontSize=8.5,
                           textColor=CODE_TEXT, leading=13))]],
              colWidths=[170*mm]),
    ]
    t = story[-1]
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), CODE_BG),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("ROUNDEDCORNERS", [6]),
    ]))

    story += [
        Spacer(1, 4*mm),
        Paragraph("Internamente el Widget:", S_H3),
        Paragraph("• Crea un overlay oscuro sobre la pagina del comercio.", S_BULLET),
        Paragraph("• Abre un iframe apuntando al Hosted Checkout de MediaNetPay "
                  "(GET /pay/{token}).", S_BULLET),
        Paragraph("• Escucha mensajes del iframe via postMessage.", S_BULLET),
        Paragraph("• Cuando el pago termina: cierra el modal y llama onSuccess().", S_BULLET),
        Paragraph("• El cliente NUNCA sale del sitio del comercio.", S_BULLET),
    ]

    # ── 3. POR QUE INTEGRAR EL WIDGET ─────────────────────────────────────────
    story += [
        Spacer(1, 6*mm),
        section_header("3. Por que integrar el Widget JS"),
        Spacer(1, 4*mm),
        Paragraph(
            "La decision de integrar el Widget JS versus no hacerlo impacta directamente "
            "la tasa de conversion del comercio. A continuacion, la comparativa:",
            S_BODY),
        Spacer(1, 4*mm),
    ]

    comp_data = [
        ["Aspecto", "Sin Widget JS\n(redireccion simple)", "Con Widget JS\n(modal integrado)"],
        ["Experiencia\ndel cliente",
         "Sale del sitio del comercio\nhacia pagina de MediaNet",
         "Se queda en el sitio del comercio.\nModal aparece encima."],
        ["Tasa de\nabandonos",
         "Alta — muchos clientes no regresan\ntras ser redirigidos",
         "Baja — el cliente nunca\npercibe que 'salio'"],
        ["Confianza\nvisual",
         "El cliente ve una URL diferente\n(medianet.com.ec)",
         "El cliente ve la URL del comercio\ndurante todo el proceso"],
        ["Implementacion",
         "2 lineas en el plugin\n(ya implementado)",
         "3 lineas adicionales de JS\n+ token pre-creado server-side"],
        ["Requiere\naceso MediaNet",
         "Si — credenciales propias\npor comercio",
         "No — usa el token de\nMediaNetPay"],
        ["Conversion\nestimada",
         "Base (referencia)",
         "+15% a +30% segun\nbenchmarks de la industria"],
    ]
    comp_table = Table(comp_data, colWidths=[38*mm, 65*mm, 67*mm])
    comp_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        # Highlight Widget column
        ("BACKGROUND", (2,1), (2,-1), colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR", (2,1), (2,-1), colors.HexColor("#166534")),
        ("FONTNAME", (2,1), (2,-1), "Helvetica-Bold"),
        # Highlight last row
        ("BACKGROUND", (1,-1), (-1,-1), colors.HexColor("#dcfce7")),
        ("TEXTCOLOR", (1,-1), (-1,-1), GREEN),
        ("FONTNAME", (1,-1), (-1,-1), "Helvetica-Bold"),
    ]))
    story += [comp_table, Spacer(1, 4*mm),
        info_box(
            "IMPORTANTE: El Widget JS requiere que el comercio tenga acceso a la API "
            "de MediaNetPay para generar el token server-side antes de abrir el modal. "
            "El token se genera con POST /v1/links desde el backend del comercio.",
            bg=colors.HexColor("#fffbeb"), border=ORANGE, icon="!"),
        PageBreak()
    ]

    # ── 4. FLUJO CON WIDGET ────────────────────────────────────────────────────
    story += [
        section_header("4. Flujo de pago con Widget JS"),
        Spacer(1, 4*mm),
        Paragraph(
            "El siguiente diagrama muestra el flujo completo de un pago con Widget JS, "
            "desde que el cliente hace click en 'Pagar' hasta recibir la confirmacion:",
            S_BODY),
        Spacer(1, 4*mm),
    ]

    flujo_data = [
        ["Paso", "Actor", "Accion", "Resultado"],
        ["1", "Comercio\n(servidor)", "POST /v1/links\ncon monto y descripcion",
         "Obtiene token\n(tok_abc123)"],
        ["2", "Comercio\n(frontend)", "MediaNetPay.open({token})\nvia Widget JS",
         "Modal se abre sobre\nel sitio del comercio"],
        ["3", "Widget JS", "GET /pay/{token}\nHosted Checkout",
         "Pagina de pago HTML\ndentro del iframe"],
        ["4", "Cliente", "Click 'Continuar al pago'\nIngresa datos opcionales",
         "POST /pay/{token}/charge"],
        ["5", "MediaNetPay\n(backend)", "Llama a MediaNet\nWebCheckout API",
         "Recibe link de pago\nde MediaNet"],
        ["6", "Cliente", "Redirigido a pagina\nde pago de MediaNet",
         "Ingresa datos de tarjeta\nen pagina de MediaNet"],
        ["7", "MediaNet", "POST url_back con\nresultado del pago",
         "MediaNetPay actualiza\nla transaccion"],
        ["8", "MediaNetPay", "Notifica webhook\ndel comercio",
         "Comercio confirma\nla orden"],
    ]
    flujo_table = Table(flujo_data, colWidths=[12*mm, 35*mm, 65*mm, 58*mm])
    flujo_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN", (0,0), (0,-1), "CENTER"),
        ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0,1), (0,-1), WHITE),
        ("BACKGROUND", (0,1), (0,-1), BLUE),
    ]))
    story += [flujo_table, Spacer(1, 4*mm),
        info_box(
            "En el paso 6, el cliente es redirigido a la pagina de MediaNet. "
            "Si el Widget esta en modo embed (iframe), el Widget redirige la ventana "
            "principal (window.top) para evitar que MediaNet quede dentro del iframe "
            "(MediaNet bloquea X-Frame-Options). El resultado es transparente para el cliente.",
            bg=LIGHT_BG, border=BLUE, icon="i"),
        PageBreak()
    ]

    # ── 5. LOS 5 PLUGINS ──────────────────────────────────────────────────────
    story += [
        section_header("5. Los 5 Plugins de Integracion"),
        Spacer(1, 4*mm),
        Paragraph(
            "MediaNetPay ofrece plugins para los principales CMS del mercado. "
            "Los comercios que ya tienen tiendas online pueden integrar MediaNet "
            "como metodo de pago en minutos, sin escribir codigo:",
            S_BODY),
        Spacer(1, 4*mm),
    ]

    plugins = [
        ("WooCommerce", "WordPress + WooCommerce 5+",
         "El plugin mas usado. Instalacion desde el Panel de WordPress. "
         "Soporta pagos corrientes y diferidos. Webhook automatico.",
         "Oficial MediaNet", BLUE),
        ("PrestaShop", "PrestaShop 1.7.8+",
         "Modulo nativo de PrestaShop. Instalacion en 2 minutos desde "
         "el gestor de modulos. Compatible con temas personalizados.",
         "Oficial MediaNet", BLUE),
        ("Magento", "Magento 1.9",
         "Modulo para la version Magento 1.9. Configuracion desde el "
         "Panel de Administracion. Soporta multi-tienda.",
         "Oficial MediaNet", BLUE),
        ("VirtueMart", "Joomla + VirtueMart 3/4",
         "Plugin vmPSPlugin nativo. Instalacion desde el Gestor de "
         "Extensiones de Joomla. Guarda historial de pagos en la DB "
         "de VirtueMart. Construido por MediaNetPay.",
         "Nuevo — MediaNetPay", ORANGE),
        ("OpenCart", "OpenCart 3.x",
         "Extension MVC completa con panel de admin. Mapeo configurable "
         "de estados de orden (pendiente/aprobado/rechazado). "
         "Construido por MediaNetPay.",
         "Nuevo — MediaNetPay", ORANGE),
    ]

    for name, version, desc, label, label_color in plugins:
        plug_data = [[
            Paragraph(f"<b>{name}</b>",
                ParagraphStyle("pn", fontName="Helvetica-Bold", fontSize=12,
                               textColor=NAVY)),
            Paragraph(label,
                ParagraphStyle("pl", fontName="Helvetica-Bold", fontSize=8,
                               textColor=WHITE, alignment=TA_CENTER)),
        ]]
        header = Table(plug_data, colWidths=[130*mm, 40*mm])
        header.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,0), LIGHT_BG),
            ("BACKGROUND", (1,0), (1,0), label_color),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING", (0,0), (0,0), 10),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ]))

        body_data = [[
            Paragraph(f"<i>{version}</i>",
                ParagraphStyle("pv", fontName="Helvetica-Oblique", fontSize=9,
                               textColor=GRAY)),
            Paragraph(desc,
                ParagraphStyle("pd", fontName="Helvetica", fontSize=9,
                               textColor=DARK, leading=13)),
        ]]
        body = Table(body_data, colWidths=[40*mm, 130*mm])
        body.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), WHITE),
            ("TOPPADDING", (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LINEBELOW", (0,0), (-1,-1), 0.3, BORDER),
        ]))

        story += [KeepTogether([header, body]), Spacer(1, 2*mm)]

    story += [
        Spacer(1, 4*mm),
        info_box(
            "Los plugins de VirtueMart y OpenCart son una contribucion original de "
            "MediaNetPay al ecosistema. MediaNet no ofrecia soporte para estos dos CMS. "
            "Estan disponibles para descarga gratuita en medianetpay.ec/developers.",
            bg=colors.HexColor("#fff7ed"), border=ORANGE, icon="*"),
        PageBreak()
    ]

    # ── 6. COMPARATIVA ────────────────────────────────────────────────────────
    story += [
        section_header("6. Comparativa: Plugin solo vs. Plugin + Widget JS"),
        Spacer(1, 4*mm),
        Paragraph(
            "Los plugins funcionan de forma independiente. El Widget JS es una mejora "
            "opcional que puede agregarse encima de cualquier plugin para mejorar "
            "la experiencia del cliente:",
            S_BODY),
        Spacer(1, 4*mm),
    ]

    comp2_data = [
        ["", "Plugin solo", "Plugin + Widget JS"],
        ["Requiere\ncredenciales MediaNet", "Si", "Si"],
        ["Cliente sale del sitio", "Si", "No"],
        ["Instalacion", "Solo el plugin", "Plugin + 3 lineas JS"],
        ["Compatible con todos\nlos CMS listados", "Si", "Si"],
        ["Actualizacion de\nestado en tiempo real", "Via webhook", "Via webhook + postMessage"],
        ["Recomendado para", "Integracion rapida,\ncomercio tecnico bajo",
         "Comercios que priorizan\nconversion y UX"],
    ]
    comp2_table = Table(comp2_data, colWidths=[55*mm, 55*mm, 60*mm])
    comp2_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BACKGROUND", (0,1), (0,-1), LIGHT_BG),
        ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0,1), (0,-1), NAVY),
        ("BACKGROUND", (2,1), (2,-1), colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR", (2,1), (2,-1), GREEN),
        ("FONTNAME", (2,1), (2,-1), "Helvetica-Bold"),
    ]))
    story += [comp2_table]

    # ── 7. VALOR PARA MEDIANET ────────────────────────────────────────────────
    story += [
        Spacer(1, 6*mm),
        section_header("7. Valor para el ecosistema MediaNet"),
        Spacer(1, 4*mm),
        Paragraph(
            "MediaNetPay aporta al ecosistema de MediaNet en tres dimensiones:",
            S_BODY),
        Spacer(1, 3*mm),
    ]

    valor_data = [
        ["Dimension", "Que aporta MediaNetPay", "Beneficio para MediaNet"],
        ["Cobertura\nde CMS",
         "Plugins para VirtueMart y OpenCart\n— los 2 que MediaNet no tenia",
         "Mas comercios pueden integrarse\nsin friccion tecnica"],
        ["Experiencia\nde usuario",
         "Widget JS que evita redireccion\ny mejora la conversion",
         "Mas pagos completados =\nmayor volumen de transacciones"],
        ["Portal y\nanalytics",
         "Dashboard, reportes, links de cobro,\nfraud scoring, recibos PDF",
         "Comercios tienen herramientas\nque antes no existian"],
        ["Acceso\nsimplificado",
         "API con pk/sk — el comercio no\nnecesita configurar MediaNet directo",
         "Menor carga de soporte tecnico\npara MediaNet"],
    ]
    valor_table = Table(valor_data, colWidths=[35*mm, 73*mm, 62*mm])
    valor_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story += [valor_table]

    # ── 8. PROXIMOS PASOS ─────────────────────────────────────────────────────
    story += [
        Spacer(1, 6*mm),
        section_header("8. Proximos pasos"),
        Spacer(1, 4*mm),
        Paragraph(
            "Para activar el Widget JS y los plugins en un comercio real, "
            "se requieren los siguientes pasos:",
            S_BODY),
        Spacer(1, 3*mm),
    ]

    pasos_data = [
        ["#", "Paso", "Responsable", "Estado"],
        ["1", "Acceso a la API de MediaNet\n(credenciales produccion)",
         "MediaNet / Socio", "Pendiente"],
        ["2", "Activar comercio en MediaNetPay\n(registro + credenciales pk/sk)",
         "Comercio", "Disponible hoy"],
        ["3", "Instalar plugin segun CMS\n(WooCommerce, PrestaShop, etc.)",
         "Comercio / Dev", "Disponible hoy"],
        ["4", "Integrar Widget JS (opcional)\ncon token generado server-side",
         "Dev del comercio", "Disponible hoy"],
        ["5", "Conectar webhook del comercio\npara recibir confirmaciones",
         "Dev del comercio", "Disponible hoy"],
        ["6", "Pruebas en ambiente QA\ncon simulador de MediaNet",
         "Comercio / QA", "Disponible hoy"],
    ]
    pasos_table = Table(pasos_data, colWidths=[10*mm, 75*mm, 45*mm, 40*mm])
    pasos_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN", (0,0), (0,-1), "CENTER"),
        ("FONTNAME", (0,1), (0,-1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0,1), (0,-1), WHITE),
        ("BACKGROUND", (0,1), (0,-1), BLUE),
        # Paso 1 pendiente
        ("TEXTCOLOR", (3,1), (3,1), RED),
        ("FONTNAME", (3,1), (3,1), "Helvetica-Bold"),
        # Resto disponible
        ("TEXTCOLOR", (3,2), (3,-1), GREEN),
        ("FONTNAME", (3,2), (3,-1), "Helvetica-Bold"),
    ]))
    story += [pasos_table, Spacer(1, 5*mm)]

    # CTA Final
    cta_data = [[Paragraph(
        "<b>Para mas informacion o para comenzar la integracion:</b><br/>"
        "soporte@medianetpay.ec  |  medianetpay.ec/developers",
        ParagraphStyle("cta", fontName="Helvetica", fontSize=10,
                       textColor=WHITE, alignment=TA_CENTER, leading=16))]]
    cta = Table(cta_data, colWidths=[170*mm])
    cta.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), NAVY),
        ("TOPPADDING", (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("ROUNDEDCORNERS", [8]),
    ]))
    story += [cta, Spacer(1, 5*mm),
        Paragraph(
            "Desarrollado por <b>Stanley Llaguno</b> — devopstanley@gmail.com",
            ParagraphStyle("author_end", fontName="Helvetica", fontSize=9,
                           textColor=GRAY, alignment=TA_CENTER)),
    ]

    # ── BUILD ─────────────────────────────────────────────────────────────────
    doc.build(story,
              onFirstPage=on_first_page,
              onLaterPages=on_page)

    print(f"PDF generado: {out}")
    import os
    print(f"Tamano: {os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    build()
