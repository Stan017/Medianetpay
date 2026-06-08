# PROPUESTA ESTRATÉGICA — MediaNetPay
**La pasarela de pagos ecommerce que Ecuador necesitaba**

Preparado por: Stan Morocho | Para: Karina — MediaNet | Mayo 2026

> "El dominio medianetpay.ec no resuelve. Los productos están prometidos en la web pero no existe ningún backend. Esta es la oportunidad de construirlo bien, desde cero, en 10 semanas."

---

## 01 / EL PROBLEMA — La promesa existe. El producto no.

MediaNet ofrece en su sitio web cinco productos de ecommerce bajo la marca MediaNetPay: Link de Cobro, Cobro por Redes Sociales, Web Checkout, Botón de Pagos y QR Code. El botón 'Afíliate' apunta a medianetpay.ec — un dominio que hoy devuelve `DNS_PROBE_FINISHED_NXDOMAIN`.

No existe servidor, no existe API, no existe portal.

| Lo que MediaNet promete | La realidad hoy |
|------------------------|-----------------|
| Productos listados públicamente en medianet.com.ec | medianetpay.ec: DNS no resuelve (sitio inexistente) |
| Botón 'Afíliate' visible en cada producto | Sin backend, sin API, sin base de datos |
| Dominio medianetpay.ec registrado | Sin portal de comercios operativo |
| Manual de usuario publicado (enero 2022) | Ningún comercio puede afiliarse de forma automática |
| Plugins WooCommerce, PrestaShop, Magento listados | Competidores como Kushki y Datafast capturan el mercado |

Mientras este producto permanece abandonado, Datafast cobra $80 de certificación + $12/mes, Kushki exige $150/mes mínimo y $6,000 de facturación, y el mercado ecuatoriano de ecommerce superó los $5,500 millones en 2024 sin que MediaNet capture una sola comisión de pasarela digital.

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

MediaNet ya tiene lo más difícil: los acuerdos con los bancos adquirentes. Cualquier competidor necesita 6 a 12 meses solo para conseguir eso. MediaNet lo tiene desde hace 19 años. Solo falta construir la capa de producto encima.

---

## 03 / LA SOLUCIÓN — MediaNetPay construido desde cero, bien hecho.

La propuesta es simple: construir todo lo que MediaNet ya prometió, con la calidad técnica y la experiencia de developer que ninguna pasarela local tiene hoy.

| Producto | Descripción | Diferencial vs competencia |
|----------|-------------|---------------------------|
| API REST + Sandbox | API documentada, keys instantáneas, sandbox | Datafast: semanas de proceso. Nosotros: 10 minutos |
| Portal self-service | Registro, dashboard, webhooks, facturación | Sin formularios en papel, sin llamadas al banco |
| Web Checkout | Modal de pago embebable con 2 líneas de script | Funciona en cualquier sitio sin dependencias de framework |
| Link de Cobro + QR | Genera links y QR desde el dashboard | Compartible por WhatsApp, no en días |
| Plugins WooCommerce / PrestaShop | Instalación en 5 minutos, configuración visual | Mejor DX que las versiones actuales |
| Analytics con IA | Insights automáticos sobre patrones de venta | Nadie en Ecuador lo tiene. Es nuestro moat técnico |

---

## 04 / MODELO DE NEGOCIO — Cómo gana plata MediaNetPay.

| Concepto | Valor |
|----------|-------|
| Tarifa pasarela por transacción aprobada | 0.3 – 0.5% |
| Mensualidad mínima | $0 (vs $150/mes de Kushki) |
| Costo de certificación | $0 (vs $80 de Datafast) |
| Breakeven estimado | $200K/mes procesado |
| Margen con $1M/mes (solo comisión pasarela) | ~$4,000/mes |
| Premium tier (roadmap) | Analytics, soporte prioritario |

El modelo es de volumen puro: cuantos más comercios procesen, mejor el margen. Sin costo de entrada para el comercio = adopción masiva. El revenue viene de la escala, no de cobrar caro a pocos.

---

## 05 / POR QUÉ VAMOS A GANAR — Aunque lleguemos últimos, llegamos mejor.

**Ventajas que ya tenemos:**
- MediaNet ya tiene los acuerdos bancarios — la barrera más alta del mercado
- El dominio, la marca y los productos ya están comunicados públicamente
- 10,000+ comercios afiliados a la red: canal de distribución inmediato
- Infraestructura de procesamiento probada por 19 años
- Equipo interno que entiende el negocio y el mercado

**Ventajas que construimos:**
- DX nivel Stripe: sandbox en 10 minutos, docs interactivas, idempotency keys
- Sin mensualidad mínima — el emprendedor de 50 ventas/mes no sale perdiendo
- Analytics con LLM integrado: insights que ningún competidor local tiene
- Onboarding en 24 horas vs semanas de proceso manual en la competencia
- Firma de webhooks HMAC-SHA256 — seguridad que nadie local implementa

> El mercado ecuatoriano nunca tuvo un Stripe. Los ingredientes siempre estuvieron en MediaNet. Solo faltaba alguien que los uniera.

---

## 06 / TIMELINE — De cero a comercios reales en 10 semanas.

| Semana | Hito | Entregable |
|--------|------|-----------|
| 1–2 | Conector MediaNet | Cobro de prueba end-to-end funcionando |
| 3–4 | API core pública | Postman collection funcionando contra la API |
| 5–6 | Portal de comercios | Un comercio puede registrarse y ver sus cobros |
| 7–8 | Plugin WooCommerce + Docs | Un developer integra en menos de 30 minutos |
| 9–10 | Beta privada | Primeras transacciones reales de clientes finales |
| Post-beta | Lanzamiento público | Producto completo disponible para todo el mercado |

---

## 07 / LO QUE NECESITO DE MEDIANET — Cuatro cosas. Sin ellas, nada de esto existe.

| Necesidad | Por qué es crítico | Alternativa si no existe |
|-----------|-------------------|--------------------------|
| Acceso a la API interna de MediaNet | Para conectar el conector de pagos al procesador | Sin esto no hay producto — es la pieza central |
| Modelo PayFac / Sub-merchant | Para onboardear comercios directamente | Sin boarding automático al banco el diferencial de self-service no existe |
| Dominio y hosting para medianetpay.ec | La marca ya está comunicada — necesitamos activarla | Nuevo dominio, pero se pierde la comunicación existente |
| Alineación con el equipo de MediaNet | Para que el conector sea oficial y no un workaround | Integración frágil que se rompe con cada cambio interno |

> El objetivo final: MediaNet captura el mercado de ecommerce que hoy se está yendo a Kushki, Datafast y Payphone — con su propia infraestructura, su propia marca, y un producto mejor que todos ellos.

---

*MediaNet S.A. | medianetpay.ec | Propuesta confidencial — Mayo 2026*
