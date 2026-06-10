"""
Genera MediaNetPay_Pitch_CLEAN.pdf — celdas con Paragraph para word-wrap correcto.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

NAVY   = colors.HexColor("#003358")
ORANGE = colors.HexColor("#F89937")
GRAY   = colors.HexColor("#64748B")
LIGHT  = colors.HexColor("#F0F4F8")
WHITE  = colors.white

# ── Estilos de celda ──────────────────────────────────────────────────────────
CELL      = ParagraphStyle("cell",      fontName="Helvetica",      fontSize=9,  leading=13, textColor=colors.HexColor("#1E293B"))
CELL_H    = ParagraphStyle("cell_h",   fontName="Helvetica-Bold", fontSize=9,  leading=13, textColor=WHITE)
CELL_BOLD = ParagraphStyle("cell_b",   fontName="Helvetica-Bold", fontSize=9,  leading=13, textColor=colors.HexColor("#1E293B"))

def p(text, style=None): return Paragraph(text, style or CELL)
def ph(text):            return Paragraph(text, CELL_H)
def pb(text):            return Paragraph(text, CELL_BOLD)

def tbl(rows, widths):
    """rows[0] = header, resto = datos. Soporta Paragraph en celdas."""
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  NAVY),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, LIGHT]),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    return t

def build(out):
    doc = SimpleDocTemplate(out, pagesize=A4,
        leftMargin=2.2*cm, rightMargin=2.2*cm,
        topMargin=2*cm,    bottomMargin=2*cm,
        title="MediaNetPay — Propuesta Estrategica",
        author="Stanley Llaguno")

    W = A4[0] - 4.4*cm
    story = []

    # estilos de texto libre
    T  = ParagraphStyle("T",  fontName="Helvetica-Bold",   fontSize=30, textColor=NAVY, alignment=TA_CENTER, spaceAfter=6,  leading=36)
    S  = ParagraphStyle("S",  fontName="Helvetica",        fontSize=13, textColor=GRAY, alignment=TA_CENTER, spaceAfter=8)
    M  = ParagraphStyle("M",  fontName="Helvetica",        fontSize=10, textColor=GRAY, alignment=TA_CENTER, spaceAfter=18)
    Q  = ParagraphStyle("Q",  fontName="Helvetica-Oblique",fontSize=11, textColor=GRAY, leading=17, leftIndent=16, rightIndent=16, spaceAfter=14, backColor=LIGHT)
    N  = ParagraphStyle("N",  fontName="Helvetica-Bold",   fontSize=9,  textColor=ORANGE, spaceAfter=2, spaceBefore=18)
    H  = ParagraphStyle("H",  fontName="Helvetica-Bold",   fontSize=16, textColor=NAVY, leading=20, spaceAfter=8)
    B  = ParagraphStyle("B",  fontName="Helvetica",        fontSize=10, textColor=colors.HexColor("#1E293B"), leading=15, spaceAfter=8)
    SB = ParagraphStyle("SB", fontName="Helvetica-Bold",   fontSize=10, textColor=colors.HexColor("#1E293B"), spaceAfter=4, spaceBefore=10)
    BU = ParagraphStyle("BU", fontName="Helvetica",        fontSize=10, textColor=colors.HexColor("#1E293B"), leading=15, leftIndent=14, spaceAfter=3)
    FT = ParagraphStyle("FT", fontName="Helvetica",        fontSize=8,  textColor=GRAY, alignment=TA_CENTER)

    HR = lambda: HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=4)

    # ── PORTADA ───────────────────────────────────────────────────────────────
    nav = Table([["  "]], colWidths=[W], rowHeights=[3.5*cm])
    nav.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1), NAVY)]))
    story.append(nav)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("MediaNetPay", T))
    story.append(Paragraph("La pasarela de pagos ecommerce que Ecuador necesitaba", S))
    story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=10))
    story.append(Paragraph("Preparado por: <b>Stanley Llaguno</b>  |  Para: <b>Karina - MediaNet S.A.</b>  |  Junio 2026", M))
    story.append(Paragraph(
        '"El dominio medianetpay.ec existe, la marca esta comunicada, los productos estan '
        'prometidos pero no hay nada detras. Esta propuesta no solo identifica el problema: '
        'ya lo resuelve."', Q))
    story.append(PageBreak())

    # ── 01 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("01", N))
    story.append(Paragraph("El problema - La promesa existe. El producto no.", H))
    story.append(Paragraph(
        "MediaNet ofrece en su sitio web cinco productos de ecommerce bajo la marca MediaNetPay. "
        "El boton Afiliate apunta a medianetpay.ec - un dominio que resuelve pero devuelve una "
        "pagina en blanco. No existe servidor, no existe API, no existe portal. "
        "Solo una promesa sin cumplir.", B))
    story.append(tbl([
        [ph("Lo que MediaNet promete"),        ph("La realidad hoy")],
        [p("5 productos listados en medianet.com.ec"), p("medianetpay.ec: dominio activo, pagina vacia, sin backend")],
        [p("Boton Afiliate visible en cada producto"),  p("Sin portal de comercios operativo")],
        [p("Manual de usuario publicado (enero 2022)"), p("Ningun comercio puede afiliarse automaticamente")],
        [p("Plugins WooCommerce, PrestaShop, Magento"),  p("Solo 3 de 5 plugins existian - VirtueMart y OpenCart faltaban")],
        [p("Productos de cobro digital completos"),      p("Kushki y Datafast capturan el mercado")],
    ], [W*0.46, W*0.54]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Datafast cobra $80 de certificacion + $12/mes. Kushki exige $150/mes minimo. "
        "El mercado ecuatoriano de ecommerce supero los <b>$5,500 millones en 2024</b> "
        "sin que MediaNet capture una sola comision de pasarela digital.", B))
    story.append(HR())

    # ── 02 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("02", N))
    story.append(Paragraph("La oportunidad - El mercado esta listo. La infraestructura tambien.", H))
    story.append(tbl([
        [ph("Metrica"),                               ph("Valor")],
        [p("Ecommerce Ecuador 2024"),                 p("$5,500M")],
        [p("Crecimiento proyectado 2025 (CECE)"),     p("+15% estimado anual")],
        [p("Usuarios internet Ecuador"),              p("15.2M - 83.7% penetracion")],
        [p("Comercios sin pasarela digital (PyMEs)"), p(">60%")],
        [p("Comision promedio competencia"),          p("5-8% por transaccion")],
        [p("Ventaja MediaNet"),                       p("Acuerdos bancarios con Produbanco, Bolivariano e Internacional")],
    ], [W*0.44, W*0.56]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "MediaNet ya tiene lo mas dificil: los acuerdos bancarios adquirentes. "
        "Cualquier competidor necesita 6 a 12 meses solo para conseguir eso. "
        "MediaNet lo tiene desde hace <b>19 anos</b>. Solo faltaba construir la capa de producto encima.", B))
    story.append(PageBreak())

    # ── 03 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("03", N))
    story.append(Paragraph("Lo que ya esta construido - Comparativa completa", H))

    story.append(Paragraph("Productos prometidos en la web de MediaNet", SB))
    story.append(tbl([
        [ph("Producto prometido"),       ph("Estado")],
        [p("Link de Cobro"),             p("Funcionando - link con monto, vigencia y limite de usos")],
        [p("Cobro por Redes Sociales"),  p("Funcionando - link compartible por WhatsApp en un toque")],
        [p("Web Checkout"),              p("Funcionando - modal embebable con 2 lineas de script")],
        [p("Boton de Pagos"),            p("Funcionando - widget.js instalable en cualquier sitio web")],
        [p("QR Code"),                   p("Funcionando - QR dinamico desde dashboard y app movil")],
    ], [W*0.32, W*0.68]))
    story.append(Spacer(1, 0.25*cm))

    story.append(Paragraph("Productos adicionales construidos (mas alla de lo prometido)", SB))
    story.append(tbl([
        [ph("Producto nuevo"),                  ph("Descripcion")],
        [p("Portal self-service"),              p("Registro, dashboard, metricas, API keys, webhooks - sin formularios en papel")],
        [p("App Movil Android"),                p("Login biometrico, cobro por QR, historial, SoftPOS datafono")],
        [p("SoftPOS - Datafono en el celular"), p("El celular Android actua como datafono via NFC. Cap demo: ~20 transacciones")],
        [p("Vitrina Digital"),                  p("Pagina publica de servicios con URL compartible, imagen, precios y link de pago")],
        [p("Plugin VirtueMart"),                p("Resuelve uno de los dos plugins faltantes en la plantilla original de MediaNet")],
        [p("Plugin OpenCart"),                  p("Resuelve el segundo plugin faltante - los 5 plugins estan completos")],
        [p("Analytics con IA"),                 p("Insights automaticos en espanol por comercio usando Claude (Anthropic)")],
        [p("Notificaciones push"),              p("Alerta al comercio cuando entra un pago o se paga un link de cobro")],
        [p("API Sandbox documentada"),          p("Mock de la API de MediaNet para developers - integran sin acceso real")],
        [p("Webhooks HMAC-SHA256"),             p("Seguridad de nivel bancario en notificaciones salientes - nadie local lo tiene")],
    ], [W*0.30, W*0.70]))
    story.append(Spacer(1, 0.25*cm))

    story.append(Paragraph("Plataformas y canales cubiertos", SB))
    story.append(tbl([
        [ph("Canal"),                          ph("Estado")],
        [p("Web (cualquier sitio)"),            p("Listo - Widget JS + boton de pago")],
        [p("WooCommerce"),                      p("Listo - Plugin nativo")],
        [p("PrestaShop"),                       p("Listo - Plugin nativo")],
        [p("VirtueMart"),                       p("Listo - Plugin nativo")],
        [p("OpenCart"),                         p("Listo - Plugin nativo")],
        [p("Redes Sociales / WhatsApp"),        p("Listo - Link de Cobro compartible")],
        [p("Punto de venta fisico (retail)"),   p("Listo - SoftPOS, celular como datafono")],
        [p("QR en local / menu / tarjeta"),     p("Listo - QR dinamico")],
        [p("Pagina publica de servicios"),      p("Listo - Vitrina Digital")],
    ], [W*0.44, W*0.56]))
    story.append(PageBreak())

    # ── 04 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("04", N))
    story.append(Paragraph("Modelo de negocio - Como gana plata MediaNetPay.", H))
    story.append(tbl([
        [ph("Concepto"),                             ph("Valor")],
        [p("Tarifa por transaccion aprobada"),       p("0.3 - 0.5%")],
        [p("Mensualidad minima"),                    p("$0 (vs $150/mes de Kushki)")],
        [p("Costo de certificacion"),                p("$0 (vs $80 de Datafast)")],
        [p("Breakeven estimado"),                    p("$200K/mes procesado")],
        [p("Margen con $1M/mes (comision)"),         p("~$4,000/mes")],
        [p("Premium tier (roadmap)"),                p("Analytics avanzado, soporte prioritario, SoftPOS pro")],
    ], [W*0.5, W*0.5]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Sin costo de entrada = adopcion masiva. El revenue viene de la escala, no de cobrar caro a pocos.", B))
    story.append(HR())

    # ── 05 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("05", N))
    story.append(Paragraph("Por que vamos a ganar - Aunque lleguemos ultimos, llegamos mejor.", H))
    story.append(Paragraph("<b>Ventajas que ya tenia MediaNet:</b>", B))
    for b in [
        "Acuerdos bancarios con Produbanco, Bolivariano e Internacional - la barrera mas alta del mercado",
        "Dominio, marca y productos ya comunicados publicamente",
        "10,000+ comercios afiliados a la red: canal de distribucion inmediato",
        "Infraestructura de procesamiento probada por 19 anos",
    ]:
        story.append(Paragraph(f"- {b}", BU))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("<b>Ventajas que construimos:</b>", B))
    for b in [
        "DX nivel Stripe: sandbox en 10 minutos, docs interactivas, idempotency keys",
        "Sin mensualidad minima - el emprendedor de 50 ventas/mes no sale perdiendo",
        "SoftPOS: el celular como datafono - nadie local lo ofrece integrado",
        "Vitrina Digital: pagina de servicios publica con link de pago directo",
        "5 de 5 plugins del ecosistema e-commerce ecuatoriano cubiertos",
        "Analytics con LLM integrado - insights que ningun competidor local tiene",
        "Onboarding en 24 horas vs semanas de proceso manual en la competencia",
    ]:
        story.append(Paragraph(f"- {b}", BU))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        '"El mercado ecuatoriano nunca tuvo un Stripe. Los ingredientes siempre estuvieron '
        'en MediaNet. Solo faltaba alguien que los uniera."', Q))
    story.append(PageBreak())

    # ── 06 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("06", N))
    story.append(Paragraph("Vision a futuro - Mas alla del ecommerce", H))
    story.append(Paragraph(
        "El ecommerce de hoy se construye para el retail. El de manana se construye para la IA. "
        "Ecuador tiene 4 proyectos de datacenter activos o en construccion (2024-2026). "
        "La IA generativa requiere infraestructura de pagos de baja latencia para monetizar APIs, "
        "modelos y servicios por uso. MediaNet, con 19 anos de operacion bancaria certificada, "
        "esta posicionada para ser el proveedor de tecnologia de pagos de esa infraestructura.", B))
    story.append(Paragraph(
        "<b>El camino:</b>  pasarela ecommerce  -->  procesador para plataformas digitales  "
        "-->  infraestructura de pagos para servicios de IA en Ecuador.", B))
    story.append(HR())

    # ── 07 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("07", N))
    story.append(Paragraph("Timeline - De prototipo a comercios reales", H))
    story.append(tbl([
        [ph("Fase"),                          ph("Estado"),      ph("Entregable")],
        [p("Analisis de mercado"),            pb("Completo"),    p("Documento de ineficiencias e-commerce Ecuador")],
        [p("Backend API + autenticacion"),    pb("Completo"),    p("API REST desplegada en GCP Cloud Run")],
        [p("Portal self-service"),            pb("Completo"),    p("Dashboard de comercios en produccion")],
        [p("App Movil Android"),              pb("Completo"),    p("APK instalable, SoftPOS funcional")],
        [p("Plugins (5/5)"),                  pb("Completo"),    p("WooCommerce, PrestaShop, VirtueMart, OpenCart + Widget JS")],
        [p("Vitrina Digital"),                pb("Completo"),    p("Pagina publica por comercio, URL compartible")],
        [p("Analytics + IA"),                 pb("Completo"),    p("Insights automaticos en espanol")],
        [p("Conexion API MediaNet"),          p("Pendiente"),    p("Requiere acceso a la API interna de MediaNet")],
        [p("Beta privada"),                   p("Pendiente"),    p("Primeras transacciones reales con comercios reales")],
        [p("Lanzamiento publico"),            p("Pendiente"),    p("Producto completo para todo el mercado")],
    ], [W*0.32, W*0.15, W*0.53]))
    story.append(HR())

    # ── 08 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("08", N))
    story.append(Paragraph("Lo que necesito de MediaNet - Tres cosas.", H))
    story.append(Paragraph(
        "Todo lo demas ya esta construido. La plataforma existe, funciona, y puede mostrarse en vivo. "
        "Solo faltan estos tres puntos para ir a produccion:", B))
    story.append(tbl([
        [ph("Necesidad"),                          ph("Por que es critico")],
        [p("Acceso a la API interna de MediaNet"), p("El unico GET/POST que falta para que todo funcione en produccion")],
        [p("Modelo PayFac / Sub-merchant"),        p("Para onboardear comercios sin proceso manual con el banco")],
        [p("Alineacion con el equipo tecnico"),    p("Para que el conector sea oficial y no un workaround fragil")],
    ], [W*0.38, W*0.62]))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph(
        '"MediaNet ya tiene los acuerdos bancarios, la marca y 10,000 comercios. '
        'Nosotros ya tenemos el producto. El unico paso que falta es conectarlos."', Q))
    story.append(Spacer(1, 0.8*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "MediaNet S.A.  |  medianetpay.ec  |  Propuesta confidencial - Junio 2026",
        FT))

    doc.build(story)
    print(f"Listo: {out}")

if __name__ == "__main__":
    build(r"C:\Users\stanley\Desktop\MediaNetPay\Docs\docs science\MediaNetPay_Pitch_CLEAN.pdf")
