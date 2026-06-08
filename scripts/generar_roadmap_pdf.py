"""
Genera el PDF de estrategia competitiva MediaNetPay vs Payphone.
Ejecutar: python scripts/generar_roadmap_pdf.py
Salida:   Desktop/MediaNetPay_Estrategia.pdf
"""

import os
from fpdf import FPDF

OUTPUT = os.path.join(os.path.expanduser("~"), "Desktop", "MediaNetPay_Estrategia.pdf")

# ── Constantes de layout ───────────────────────────────────────────────────────
MARGIN      = 18
PAGE_W      = 210
USABLE_W    = PAGE_W - MARGIN * 2          # 174 mm
LINE_H      = 6
SECTION_GAP = 6
ROW_H       = 7


def _s(text: str) -> str:
    """Elimina caracteres fuera de Latin-1 para compatibilidad con fuentes built-in."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


class PDF(FPDF):
    def header(self):
        # Linea superior delgada
        self.set_draw_color(0, 0, 0)
        self.set_line_width(0.3)
        self.line(MARGIN, 12, PAGE_W - MARGIN, 12)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(80, 80, 80)
        self.set_xy(MARGIN, 8)
        self.cell(0, 5, _s("MEDIANETPAY - Estrategia Competitiva 2026"), align="L")
        self.set_xy(MARGIN, 8)
        self.cell(0, 5, f"Pag. {self.page_no()}", align="R")
        self.ln(8)

    def footer(self):
        self.set_y(-13)
        self.set_line_width(0.3)
        self.line(MARGIN, self.get_y(), PAGE_W - MARGIN, self.get_y())
        self.set_font("Helvetica", "", 7)
        self.set_text_color(130, 130, 130)
        self.set_x(MARGIN)
        self.cell(0, 6, _s("Documento interno - Uso exclusivo del equipo MediaNetPay"), align="C")

    # ── Helpers ────────────────────────────────────────────────────────────────

    def section_title(self, number: str, title: str):
        self.ln(SECTION_GAP)
        self.set_fill_color(0, 0, 0)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 10)
        self.set_x(MARGIN)
        self.cell(USABLE_W, 7, _s(f"  {number}  {title.upper()}"), fill=True, ln=True)
        self.set_text_color(0, 0, 0)
        self.ln(3)

    def subsection(self, title: str):
        self.set_font("Helvetica", "B", 9)
        self.set_x(MARGIN)
        self.cell(USABLE_W, LINE_H, _s(title), ln=True)
        self.ln(1)

    def body(self, text: str, indent: int = 0):
        self.set_font("Helvetica", "", 9)
        self.set_x(MARGIN + indent)
        self.multi_cell(USABLE_W - indent, LINE_H, _s(text))

    def bullet(self, text: str, indent: int = 4):
        self.set_font("Helvetica", "", 9)
        self.set_x(MARGIN + indent)
        self.multi_cell(USABLE_W - indent - 2, LINE_H, _s(f"- {text}"))

    def spacer(self, h: float = 3):
        self.ln(h)

    def table_header(self, cols: list[tuple[str, float]]):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(30, 30, 30)
        self.set_text_color(255, 255, 255)
        self.set_line_width(0.2)
        self.set_x(MARGIN)
        for label, w in cols:
            self.cell(w, ROW_H, _s(f" {label}"), border=1, fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)

    def table_row(self, cols: list[tuple[str, float]], shade: bool = False):
        self.set_font("Helvetica", "", 8)
        fill_color = (235, 235, 235) if shade else (255, 255, 255)
        self.set_fill_color(*fill_color)
        self.set_x(MARGIN)
        for text, w in cols:
            self.cell(w, ROW_H, _s(f" {text}"), border=1, fill=True)
        self.ln()

    def check_page_break(self, needed_mm: float = 25):
        if self.get_y() > 270 - needed_mm:
            self.add_page()


# ── Construcción del documento ────────────────────────────────────────────────

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()
pdf.set_margins(MARGIN, 20, MARGIN)

# ── PORTADA ───────────────────────────────────────────────────────────────────
pdf.ln(20)
pdf.set_font("Helvetica", "B", 22)
pdf.set_x(MARGIN)
pdf.cell(USABLE_W, 10, "MEDIANETPAY", align="C", ln=True)
pdf.set_font("Helvetica", "B", 14)
pdf.set_x(MARGIN)
pdf.cell(USABLE_W, 9, "ESTRATEGIA PARA SUPERAR A PAYPHONE", align="C", ln=True)
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(80, 80, 80)
pdf.set_x(MARGIN)
pdf.cell(USABLE_W, 7, "Plan de implementacion -Mercado informal ecuatoriano -2026", align="C", ln=True)
pdf.set_text_color(0, 0, 0)
pdf.ln(4)

# Línea separadora
pdf.set_line_width(0.8)
pdf.line(MARGIN, pdf.get_y(), PAGE_W - MARGIN, pdf.get_y())
pdf.ln(8)

# Resumen ejecutivo en portada
pdf.set_font("Helvetica", "B", 9)
pdf.set_x(MARGIN)
pdf.cell(USABLE_W, LINE_H, "RESUMEN EJECUTIVO", ln=True)
pdf.set_line_width(0.3)
pdf.ln(2)
pdf.body(
    "MediaNetPay opera como procesador de pagos (modelo Medianet), no como billetera. "
    "Esto significa que el dinero va directamente a la cuenta bancaria del comerciante -"
    "sin custodia, sin regulacion de dinero electronico, con una estructura de costos "
    "estructuralmente mas baja que Payphone. Este documento define las features concretas "
    "que se pueden implementar hoy para capturar el segmento informal que Payphone "
    "atiende mal: alta comision (5% + IVA), app obligatoria, sin analitica, "
    "sin modo multi-agente."
)
pdf.ln(5)

# ── SECCIÓN 1: VENTAJA ESTRUCTURAL ───────────────────────────────────────────
pdf.section_title("1.", "Ventaja estructural: procesador vs billetera")

pdf.body(
    "El modelo de negocio define el techo regulatorio y de costos. Payphone es una "
    "billetera: capta fondos, los retiene y los mueve internamente. MediaNetPay es un "
    "procesador: conecta al cliente con el banco del comerciante sin tocar los fondos. "
    "Esa diferencia no es cosmética -determina la regulacion, el costo operativo "
    "y lo que se puede ofrecer legalmente."
)
pdf.spacer(4)

# Tabla comparativa
cols = [
    ("Factor", 48),
    ("Payphone (billetera)", 63),
    ("MediaNetPay (procesador)", 63),
]
pdf.table_header(cols)
rows = [
    ("Flujo del dinero",       "Cliente -> Payphone -> Comercio",  "Cliente -> Banco del comercio"),
    ("Custodia de fondos",     "Si -regulado por BCE",            "No -no aplica"),
    ("Fee publicado",          "5% + IVA por transaccion",         "Spread de Medianet + fee retiro"),
    ("App cliente requerida",  "Si -descarga obligatoria",        "No -paga en browser"),
    ("App comercio requerida", "Si -para cobrar",                 "No -portal web + QR"),
    ("Analitica de negocio",   "Basica / ninguna",                 "Hora pico, dia, clientes (hecho)"),
    ("Multi-agente",           "No",                               "En desarrollo"),
]
for i, row in enumerate(rows):
    pdf.table_row(list(zip(row, [48, 63, 63])), shade=(i % 2 == 0))

pdf.spacer(4)
pdf.body(
    "Conclusion: MediaNetPay puede ofrecer lo mismo que Payphone al sector informal "
    "con menor friccion (sin app), menor costo estructural y funciones que Payphone "
    "no tiene ni puede agregar facilmente sin cambiar su modelo de negocio."
)

# ── SECCIÓN 2: LO QUE YA ESTÁ HECHO ─────────────────────────────────────────
pdf.check_page_break(40)
pdf.section_title("2.", "Features implementadas")

feats_done = [
    ("Portal web del comerciante",
     "Registro, autenticacion JWT, dashboard, historial de transacciones."),
    ("Links de cobro con QR",
     "Generacion de links unicos con QR descargable. Monto fijo o monto libre "
     "(el cliente ingresa el valor al escanear)."),
    ("Link de monto libre",
     "Toggle explicito en el portal. En el checkout, campo grande con actualizacion "
     "del boton en tiempo real segun el monto que escribe el cliente. "
     "Payphone obliga a generar cada cobro desde la app."),
    ("Analitica informal",
     "Hora pico de cobros, mejor dia de la semana, tabla de clientes frecuentes "
     "(2+ pagos). Visualizacion con graficas de barras CSS puras, sin libreria externa."),
    ("Tests automatizados",
     "31 tests (unit + integration) del modulo de checkout. Corren en 0.36s "
     "sin base de datos real ni conexion a Medianet."),
    ("Seguridad del webhook",
     "Firma HMAC-SHA256 por transaccion en url_back. Prevencion de race conditions "
     "en idempotencia y en max_uses con UPDATE atomico."),
]

for i, (name, desc) in enumerate(feats_done):
    pdf.check_page_break(20)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_x(MARGIN + 2)
    pdf.cell(6, LINE_H, f"{i+1}.", ln=False)
    pdf.cell(USABLE_W - 8, LINE_H, name, ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_x(MARGIN + 8)
    pdf.multi_cell(USABLE_W - 8, 5.5, desc)
    pdf.ln(1.5)

# ── SECCIÓN 3: PIPELINE DE FEATURES ──────────────────────────────────────────
pdf.check_page_break(50)
pdf.section_title("3.", "Pipeline de features -priorizacion")

pdf.body(
    "Las siguientes features se ordenan por impacto en el usuario informal "
    "versus esfuerzo de implementacion. Todas son tecnicamente posibles hoy "
    "con el stack actual (FastAPI + Next.js + Medianet)."
)
pdf.spacer(3)

cols2 = [("Feature", 62), ("Impacto", 22), ("Esfuerzo", 22), ("Estado", 30), ("Bloqueo", 38)]
pdf.table_header(cols2)
pipeline = [
    ("Modo distribuidor",           "Muy alto",  "Medio",  "En diseno",  "Ninguno"),
    ("Boton compartir WhatsApp",    "Alto",      "Bajo",   "Pendiente",  "Ninguno"),
    ("Exportar CSV transacciones",  "Medio",     "Bajo",   "Pendiente",  "Ninguno"),
    ("Reporte PDF mensual",         "Medio",     "Medio",  "Pendiente",  "Ninguno"),
    ("Personalizacion checkout",    "Medio",     "Bajo",   "Pendiente",  "Ninguno"),
    ("Bot WhatsApp notificaciones", "Muy alto",  "Alto",   "Bloqueado",  "Sin numero WA"),
]
for i, row in enumerate(pipeline):
    pdf.table_row(list(zip(row, [62, 22, 22, 30, 38])), shade=(i % 2 == 0))

# ── SECCIÓN 4: MODO DISTRIBUIDOR ─────────────────────────────────────────────
pdf.check_page_break(30)
pdf.section_title("4.", "Modo distribuidor -diseno detallado")

pdf.body(
    "Es la feature de mayor impacto diferencial. No existe en Payphone. "
    "Resuelve el caso de uso del comercio con multiples puntos de venta o "
    "vendedores de campo."
)
pdf.spacer(4)

pdf.subsection("4.1  Casos de uso reales en Ecuador")
cases = [
    ("Distribuidor de ruta",
     "Empresa mayorista con 3-10 vendedores que visitan tiendas de barrio. "
     "El dinero va a la cuenta del dueno pero cada vendedor tiene su QR propio. "
     "El dueno ve cuanto cobro cada uno por dia/semana."),
    ("Mercado municipal o patio de comidas",
     "Cada puesto tiene su QR. Todos los pagos van al administrador del mercado. "
     "El sistema registra por puesto para cobrar el arriendo o porcentaje."),
    ("Negocio con multiples cajas o locales",
     "Farmacia con 2 cajas, cadena de 3 tiendas. Mismo RUC, misma cuenta bancaria, "
     "pero el dueno necesita saber que caja o local vendio cuanto."),
]
for name, desc in cases:
    pdf.check_page_break(18)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_x(MARGIN + 4)
    pdf.cell(0, LINE_H, name, ln=True)
    pdf.body(desc, indent=8)
    pdf.spacer(2)

pdf.check_page_break(40)
pdf.subsection("4.2  Flujo de usuario")

steps = [
    ("Dueno crea distribuidor",
     "En el portal, seccion 'Distribuidores' -> Nuevo. Ingresa nombre y opcionalmente "
     "el telefono del vendedor. El sistema genera un ID y un link/QR asignado."),
    ("Distribuidor recibe su QR",
     "El dueno descarga el QR o copia el link y se lo envia al vendedor (WhatsApp, "
     "impreso, etc.). El vendedor no necesita cuenta ni app."),
    ("Cliente paga",
     "El cliente escanea el QR del vendedor. El checkout es identico al actual. "
     "El dinero va directamente al banco del dueno via Medianet."),
    ("La transaccion queda taggeada",
     "La BD registra distributor_id en la transaccion. Sin cambios en el flujo "
     "de pago -es solo metadato adicional."),
    ("Dueno ve el reporte",
     "Dashboard 'Distribuidores': tabla con nombre, cobros del dia/semana, "
     "total acumulado. Mismo patron visual que la analitica de clientes frecuentes."),
]
for i, (step, desc) in enumerate(steps):
    pdf.check_page_break(18)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_x(MARGIN + 4)
    pdf.cell(8, LINE_H, f"Paso {i+1}", ln=False)
    pdf.cell(0, LINE_H, step, ln=True)
    pdf.body(desc, indent=12)
    pdf.spacer(2)

pdf.check_page_break(35)
pdf.subsection("4.3  Cambios tecnicos requeridos")

pdf.body("Base de datos -tabla nueva:", indent=0)
pdf.spacer(2)
db_cols = [("Campo", 40), ("Tipo", 35), ("Descripcion", 99)]
pdf.table_header(db_cols)
db_rows = [
    ("id",           "uuid PK",             "Identificador unico"),
    ("merchant_id",  "uuid FK -> merchants", "Dueno al que pertenece"),
    ("name",         "text NOT NULL",        "Nombre del vendedor o puesto"),
    ("phone",        "text (nullable)",      "Telefono opcional"),
    ("code",         "text UNIQUE",          "Codigo corto para el link"),
    ("is_active",    "bool DEFAULT true",    "Activar/desactivar sin borrar"),
    ("created_at",   "timestamptz",          "Fecha de creacion"),
]
for i, row in enumerate(db_rows):
    pdf.table_row(list(zip(row, [40, 35, 99])), shade=(i % 2 == 0))

pdf.spacer(4)
pdf.body("Cambios en tablas existentes:", indent=0)
pdf.spacer(2)
changes_cols = [("Tabla", 40), ("Campo nuevo", 40), ("Efecto", 94)]
pdf.table_header(changes_cols)
changes = [
    ("payment_links", "distributor_id (nullable FK)", "El link queda asignado a un distribuidor"),
    ("transactions",  "Sin cambio directo",           "Se obtiene via JOIN a payment_links"),
]
for i, row in enumerate(changes):
    pdf.table_row(list(zip(row, [40, 40, 94])), shade=(i % 2 == 0))

pdf.spacer(4)
pdf.body("Endpoints nuevos requeridos:", indent=0)
pdf.spacer(2)
ep_cols = [("Metodo", 20), ("Ruta", 70), ("Descripcion", 84)]
pdf.table_header(ep_cols)
endpoints = [
    ("GET",    "/v1/distributors",              "Listar distribuidores del comercio"),
    ("POST",   "/v1/distributors",              "Crear nuevo distribuidor + generar link/QR"),
    ("PATCH",  "/v1/distributors/{id}",         "Editar nombre o desactivar"),
    ("GET",    "/v1/analytics/distributors",    "Ventas por distribuidor (periodo, ranking)"),
]
for i, row in enumerate(endpoints):
    pdf.table_row(list(zip(row, [20, 70, 84])), shade=(i % 2 == 0))

# ── SECCIÓN 5: FEATURES DE BAJO ESFUERZO ─────────────────────────────────────
pdf.check_page_break(30)
pdf.section_title("5.", "Features de bajo esfuerzo -alto retorno")

pdf.subsection("5.1  Boton 'Compartir por WhatsApp'")
pdf.body(
    "En el portal, junto a cada link de cobro, un boton 'Compartir' abre "
    "wa.me/?text=... con el mensaje pre-escrito: "
    "'Te comparto mi link de pago: [URL]'. El comerciante lo reenvía al cliente"
    "en un toque. Resuelve el 80% del caso del bot de WhatsApp sin necesitar "
    "API ni numero dedicado. Esfuerzo: menos de 1 hora (solo Next.js, sin backend)."
)
pdf.spacer(3)

pdf.subsection("5.2  Exportar CSV de transacciones")
pdf.body(
    "Boton 'Exportar' en la pantalla de transacciones. Genera un archivo .csv "
    "con: fecha, descripcion, monto, estado, cliente, cedula/RUC. "
    "Util para negocios que llevan contabilidad en Excel y para declaraciones al SRI. "
    "Payphone no lo ofrece. Esfuerzo: bajo (endpoint GET que devuelve text/csv, "
    "boton en el portal)."
)
pdf.spacer(3)

pdf.subsection("5.3  Personalizacion del checkout")
pdf.body(
    "El comerciante sube su logo (imagen) desde el portal. La pagina de pago "
    "que ve el cliente muestra ese logo en lugar del generico de MediaNetPay. "
    "Genera confianza en el cliente final y diferencia al negocio. "
    "Esfuerzo: bajo-medio (campo en el modelo Merchant, upload de imagen, "
    "render en checkout.py)."
)

# ── SECCIÓN 6: BOT WHATSAPP ───────────────────────────────────────────────────
pdf.check_page_break(30)
pdf.section_title("6.", "Bot WhatsApp -arquitectura para cuando este disponible")

pdf.body(
    "Actualmente bloqueado por falta de numero de WhatsApp Business. "
    "Se documenta la arquitectura para implementacion rapida cuando se consiga el numero."
)
pdf.spacer(3)

pdf.subsection("6.1  Caso de uso principal")
pdf.body(
    "Cuando un cliente paga exitosamente, el webhook de MediaNet llega a "
    "/v1/webhooks/medianet-callback, cambia la transaccion a 'completed' y "
    "en ese mismo momento se dispara un mensaje de WhatsApp al comerciante:"
)
pdf.spacer(2)
pdf.set_font("Courier", "", 8)
pdf.set_x(MARGIN + 6)
pdf.set_fill_color(240, 240, 240)
pdf.set_x(MARGIN + 6)
pdf.multi_cell(USABLE_W - 12, 5, _s(
    "Cobro recibido\n"
    "Monto:    $25.00 USD\n"
    "De:       Ana Garcia (1712345678)\n"
    "Concepto: Almuerzo del dia\n"
    "Ref:      MN-00234567"
), fill=True)
pdf.ln(3)

pdf.subsection("6.2  Integracion tecnica")
bullets_wa = [
    "Meta Cloud API -webhook POST /api/webhook para recibir mensajes entrantes.",
    "Al completarse una transaccion, llamada a POST https://graph.facebook.com/v19.0/"
    "{PHONE_ID}/messages con template o mensaje libre.",
    "El numero de WhatsApp del comerciante se almacena en la tabla merchants "
    "(campo whatsapp_phone, ya previsto en el diseno).",
    "Sin cambios en el flujo de Medianet -se agrega como efecto secundario "
    "del webhook existente.",
]
for b in bullets_wa:
    pdf.bullet(b)

# ── SECCIÓN 7: REPORTE PDF ────────────────────────────────────────────────────
pdf.check_page_break(25)
pdf.section_title("7.", "Reporte PDF mensual")

pdf.body(
    "El comerciante descarga un estado de cuenta mensual en PDF desde el portal. "
    "Incluye: resumen de totales, listado de transacciones, grafica de actividad, "
    "datos del comercio para contabilidad. "
    "Generado con fpdf2 (ya en dependencias del proyecto). "
    "Formato limpio, en blanco y negro, apto para imprimir o adjuntar en email."
)
pdf.spacer(3)

pdf.subsection("Contenido del reporte mensual")
report_items = [
    "Encabezado con nombre del negocio, RUC y periodo.",
    "Resumen: total cobrado, numero de transacciones, monto promedio.",
    "Tabla detallada: fecha, descripcion, cliente, monto, estado.",
    "Firma digital del documento (hash SHA-256 del contenido).",
    "Pie de pagina con aviso de documento oficial para efectos contables.",
]
for item in report_items:
    pdf.bullet(item)

# ── SECCIÓN 8: CONCLUSIÓN ─────────────────────────────────────────────────────
pdf.check_page_break(30)
pdf.section_title("8.", "Conclusion y orden de implementacion sugerido")

pdf.body(
    "MediaNetPay tiene ventaja estructural sobre Payphone en costo y modelo. "
    "Las features implementadas ya diferencian el producto. "
    "El orden de implementacion sugerido maximiza impacto con el minimo esfuerzo:"
)
pdf.spacer(4)

order_cols = [("#", 10), ("Feature", 80), ("Impacto vs Payphone", 84)]
pdf.table_header(order_cols)
order = [
    ("1", "Boton compartir por WhatsApp",       "Resuelve el bot sin API, impacto inmediato"),
    ("2", "Exportar CSV",                        "Diferenciador para negocios formales/SRI"),
    ("3", "Modo distribuidor",                   "Feature exclusiva -Payphone no la tiene"),
    ("4", "Personalizacion del checkout",        "Confianza del cliente final"),
    ("5", "Reporte PDF mensual",                 "Herramienta contable -retension"),
    ("6", "Bot WhatsApp (cuando haya numero)",   "Mayor impacto total -notificacion push"),
]
for i, row in enumerate(order):
    pdf.table_row(list(zip(row, [10, 80, 84])), shade=(i % 2 == 0))

pdf.spacer(5)
pdf.body(
    "El modo distribuidor es la unica feature de la lista que Payphone "
    "estructuralmente no puede replicar sin cambiar su modelo (requiere "
    "custodia multi-wallet). Para MediaNetPay es solo metadatos sobre "
    "transacciones existentes -no cambia el flujo de dinero. "
    "Eso es la ventaja competitiva sostenible."
)

# ── Guardar ────────────────────────────────────────────────────────────────────
pdf.output(OUTPUT)
print(f"PDF generado: {OUTPUT}")
