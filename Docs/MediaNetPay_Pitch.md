# PROPUESTA ESTRATÉGICA — MediaNetPay
**La pasarela de pagos ecommerce que Ecuador necesitaba**

Preparado por: Stan Morocho | Para: Karina — MediaNet | Junio 2026

> "El dominio medianetpay.ec existe, la marca está comunicada, los productos están prometidos — pero no hay nada detrás. Esta propuesta no solo identifica el problema: ya lo resuelve."

---

## 01 / EL PROBLEMA — La promesa existe. El producto no.

MediaNet ofrece en su sitio web cinco productos de ecommerce bajo la marca MediaNetPay: Link de Cobro, Cobro por Redes Sociales, Web Checkout, Botón de Pagos y QR Code. El botón 'Afíliate' apunta a medianetpay.ec — un dominio que resuelve pero devuelve una página en blanco.

No existe servidor, no existe API, no existe portal. Solo una promesa sin cumplir.

| Lo que MediaNet promete | La realidad hoy |
|------------------------|-----------------|
| Productos listados públicamente en medianet.com.ec | medianetpay.ec: dominio activo, página vacía, sin backend |
| Botón 'Afíliate' visible en cada producto | Sin portal de comercios operativo |
| Manual de usuario publicado (enero 2022) | Ningún comercio puede afiliarse de forma automática |
| Plugins WooCommerce, PrestaShop, Magento listados | Solo 3 de 5 plugins existían — VirtueMart y OpenCart faltaban |
| Productos de cobro digital completos | Competidores como Kushki y Datafast capturan el mercado |

Mientras este producto permanece abandonado, Datafast cobra $80 de certificación + $12/mes, Kushki exige $150/mes mínimo, y el mercado ecuatoriano de ecommerce superó los $5,500 millones en 2024 sin que MediaNet capture una sola comisión de pasarela digital.

---

## 02 / LA OPORTUNIDAD — El mercado está listo. La infraestructura también.

| Métrica | Valor |
|---------|-------|
| Ecommerce Ecuador 2024 | $5,500M |
| Crecimiento proyectado 2025 (CECE) | +15% estimado anual |
| Usuarios internet Ecuador | 15.2M — 83.7% penetración |
| Comercios sin pasarela digital (PyMEs) | >60% |
| Comisión promedio competencia por transacción | 5–8% |
| Ventaja MediaNet | Ya es procesador con acuerdos Produbanco + Bolivariano + Internacional |

MediaNet ya tiene lo más difícil: los acuerdos con los bancos adquirentes. Cualquier competidor necesita 6 a 12 meses solo para conseguir eso. MediaNet lo tiene desde hace 19 años. Solo faltaba construir la capa de producto encima.

---

## 03 / LO QUE YA ESTÁ CONSTRUIDO — Comparativa completa

### Productos prometidos en la web de MediaNet → Estado actual

| Producto prometido | Estado |
|--------------------|--------|
| Link de Cobro | ✅ Funcionando — genera link con monto, vigencia y límite de usos |
| Cobro por Redes Sociales | ✅ Funcionando — es el mismo link, compartible por WhatsApp en un toque |
| Web Checkout | ✅ Funcionando — modal de pago embebable con 2 líneas de script |
| Botón de Pagos | ✅ Funcionando — widget.js instalable en cualquier web sin framework |
| QR Code | ✅ Funcionando — QR dinámico generado desde dashboard y app móvil |

### Productos adicionales construidos (más allá de lo prometido)

| Producto nuevo | Descripción |
|----------------|-------------|
| Portal self-service | Registro, dashboard, métricas, API keys, webhooks — sin formularios en papel |
| App Móvil Android | Login biométrico, cobro por QR, historial de transacciones, SoftPOS |
| SoftPOS — Datáfono en el celular | El celular Android actúa como datáfono vía NFC. Cap demo: ~20 transacciones |
| Vitrina Digital | Página pública de servicios por comercio — URL compartible, imagen, precios, link de pago directo |
| Plugin WooCommerce | Instalación en 5 minutos, configurado visualmente desde el panel de WordPress |
| Plugin PrestaShop | Mismo flujo — módulo instalable desde el panel de PrestaShop |
| Plugin VirtueMart | Resuelve uno de los dos plugins faltantes en la plantilla original de MediaNet |
| Plugin OpenCart | Resuelve el segundo plugin faltante — la lista de 5 plugins está completa |
| Analytics con IA | Insights automáticos en español por comercio usando Claude (Anthropic) |
| Sistema de notificaciones | Push notifications + campana en app cuando entra un pago o se paga un link |
| API Sandbox documentada | Mock de la API de MediaNet para que developers puedan integrar sin acceso real |
| Webhooks firmados HMAC-SHA256 | Seguridad de nivel bancario en notificaciones salientes — nadie local lo implementa |

### Plataformas / canales cubiertos

| Canal | Estado |
|-------|--------|
| Web (cualquier sitio) | ✅ Widget JS + botón de pago |
| WooCommerce | ✅ Plugin nativo |
| PrestaShop | ✅ Plugin nativo |
| VirtueMart | ✅ Plugin nativo |
| OpenCart | ✅ Plugin nativo |
| Redes Sociales / WhatsApp | ✅ Link de Cobro |
| Punto de venta físico (retail) | ✅ SoftPOS — celular como datáfono |
| QR en local / menú / tarjeta | ✅ QR dinámico |
| Página pública de servicios | ✅ Vitrina Digital |

---

## 04 / MODELO DE NEGOCIO — Cómo gana plata MediaNetPay.

| Concepto | Valor |
|----------|-------|
| Tarifa pasarela por transacción aprobada | 0.3 – 0.5% |
| Mensualidad mínima | $0 (vs $150/mes de Kushki) |
| Costo de certificación | $0 (vs $80 de Datafast) |
| Breakeven estimado | $200K/mes procesado |
| Margen con $1M/mes (solo comisión pasarela) | ~$4,000/mes |
| Premium tier (roadmap) | Analytics avanzado, soporte prioritario, SoftPOS pro |

El modelo es de volumen puro: sin costo de entrada = adopción masiva. El revenue viene de la escala, no de cobrar caro a pocos.

---

## 05 / POR QUÉ VAMOS A GANAR — Aunque lleguemos últimos, llegamos mejor.

**Ventajas que ya tenemos:**
- MediaNet ya tiene los acuerdos bancarios — la barrera más alta del mercado
- El dominio, la marca y los productos ya están comunicados públicamente
- 10,000+ comercios afiliados a la red: canal de distribución inmediato
- Infraestructura de procesamiento probada por 19 años

**Ventajas que construimos:**
- DX nivel Stripe: sandbox en 10 minutos, docs interactivas, idempotency keys
- Sin mensualidad mínima — el emprendedor de 50 ventas/mes no sale perdiendo
- SoftPOS: el celular como datáfono — nadie local lo ofrece integrado
- Vitrina Digital: página de servicios pública con link de pago directo — canal de ventas propio
- Todos los plugins del ecosistema e-commerce ecuatoriano cubiertos (5/5)
- Analytics con LLM integrado: insights que ningún competidor local tiene
- Onboarding en 24 horas vs semanas de proceso manual en la competencia

> El mercado ecuatoriano nunca tuvo un Stripe. Los ingredientes siempre estuvieron en MediaNet. Solo faltaba alguien que los uniera.

---

## 06 / VISIÓN A FUTURO — Más allá del ecommerce

El ecommerce de hoy se construye para el retail. El de mañana se construye para la IA.

Ecuador tiene 4 proyectos de datacenter activos o en construcción (2024-2026). La IA generativa requiere infraestructura de pagos de baja latencia y alta disponibilidad para monetizar APIs, modelos y servicios por uso. MediaNet, con 19 años de operación bancaria certificada, está posicionada para ser el proveedor de tecnología de pagos de esa infraestructura.

El camino: pasarela ecommerce → procesador para plataformas digitales → infraestructura de pagos para servicios de IA en Ecuador.

---

## 07 / TIMELINE — De prototipo a comercios reales.

| Fase | Estado | Entregable |
|------|--------|-----------|
| Análisis de mercado y vacíos | ✅ Completo | Documento de ineficiencias e-commerce Ecuador |
| Backend API + autenticación | ✅ Completo | API REST desplegada en GCP Cloud Run |
| Portal self-service | ✅ Completo | Dashboard de comercios en producción |
| App Móvil Android | ✅ Completo | APK instalable, SoftPOS funcional |
| Plugins (5/5) | ✅ Completo | WooCommerce, PrestaShop, VirtueMart, OpenCart + Widget JS |
| Vitrina Digital | ✅ Completo | Página pública por comercio, URL compartible |
| Analytics + IA | ✅ Completo | Insights automáticos en español |
| Conexión API MediaNet | ⏳ Pendiente | Requiere acceso a la API interna de MediaNet |
| Beta privada con comercios reales | ⏳ Pendiente | Primeras transacciones reales |
| Lanzamiento público | ⏳ Pendiente | Producto completo para todo el mercado |

---

## 08 / LO QUE NECESITO DE MEDIANET — Tres cosas. Sin ellas, nada de esto va a producción.

| Necesidad | Por qué es crítico |
|-----------|-------------------|
| Acceso a la API interna de MediaNet | El único GET/POST que falta para que todo funcione en producción |
| Modelo PayFac / Sub-merchant | Para onboardear comercios sin proceso manual con el banco |
| Alineación con el equipo técnico | Para que el conector sea oficial y no un workaround frágil |

Todo lo demás ya está construido. La plataforma existe, funciona, y puede mostrarse en vivo.

---

*MediaNet S.A. | medianetpay.ec | Propuesta confidencial — Junio 2026*
*Stan Morocho — stan@medianetpay.ec*
