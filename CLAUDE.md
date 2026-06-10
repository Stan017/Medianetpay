# MediaNetPay — CLAUDE.md

> Contexto maestro del proyecto. Leer completo antes de tocar cualquier línea.

---

## Reglas de trabajo — Mentalidad Linus Torvalds

1. **NUNCA construir sin consultar primero.** Presentar el enfoque, esperar aprobación, luego ejecutar.
2. **NUNCA modificar código existente sin consultarlo.** Nada de refactoring no pedido.
3. **NUNCA cometer errores lógicos.** En un sistema de pagos un error lógico = dinero perdido o duplicado. Razonar el flujo completo antes de escribir.
4. **NUNCA irse por las ramas.** Si se pide X, entregar X. Scope exacto, nada más.
5. **El código debe funcionar al primer intento.** No "debería funcionar". Razonar hasta estar seguro, luego escribir.
6. **Decir la verdad aunque incomode.** Si un enfoque es malo, decirlo directo con el motivo.

---

## Qué es MediaNetPay

Pasarela de pagos ecommerce para Ecuador construida sobre la infraestructura de MediaNet S.A.
MediaNet tiene 19 años de operación como procesador de pagos con acuerdos bancarios con
Produbanco, Bolivariano e Internacional. Ya tiene 10,000+ comercios en su red de datáfonos.

El problema: MediaNet ya promete 5 productos digitales en su web (Link de Cobro, Cobro por
Redes Sociales, Web Checkout, Botón de Pagos, QR Code) pero `medianetpay.ec` no resuelve.
No hay backend, no hay API, no hay portal. Kushki y Datafast están capturando ese mercado.

La propuesta: construir todo lo prometido, con calidad técnica nivel Stripe, en 10 semanas a beta.

Cliente: Karina — MediaNet S.A.
Autor: Stanley Llaguno (github: Stan017, linkedin: stanley-llaguno-7)

---

## Qué construimos vs qué ya existe

| Componente | Responsable |
|------------|-------------|
| Procesamiento tarjetas Visa/MC | MediaNet (ya existe) |
| Clearing y liquidación interbancaria | MediaNet (ya existe) |
| Switch transaccional | MediaNet (ya existe) |
| Antifraude de red bancaria | MediaNet (ya existe) |
| Infraestructura POS / datáfono | MediaNet (ya existe) |
| **API REST pública documentada** | **Construir** |
| **Portal self-service de comercios** | **Construir** |
| **Conector MediaNet (HTTP client)** | **Construir** |
| **Checkout embebable (JS widget)** | **Construir** |
| **Link de Cobro + QR dinámico** | **Construir** |
| **Plugins WooCommerce / PrestaShop** | **Construir** |
| **Documentación interactiva + sandbox** | **Construir** |
| **Analytics con LLM (insights automáticos)** | **Construir** |
| **Máquina de estados de transacciones** | **Construir** |
| **Sistema de webhooks firmados HMAC** | **Construir** |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | FastAPI 0.115+ |
| Runtime | Python 3.12 |
| Servidor ASGI | Uvicorn + Gunicorn |
| Validación | Pydantic v2 |
| ORM | SQLAlchemy 2.0 async |
| Driver DB | asyncpg |
| Base de datos | PostgreSQL 16 |
| Cache / colas | Redis 7 + Celery 5 |
| HTTP client | httpx async |
| Frontend | Next.js 15 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Componentes | Shadcn/ui |
| Data fetching | TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |
| Auth | NextAuth.js v5 |
| Docs | Mintlify |
| Checkout widget | Vanilla JS + iframe |
| Plugin WooCommerce | PHP 8 |
| LLM (analytics) | Anthropic API (Claude) |
| Cloud | GCP Cloud Run |
| DB managed | Cloud SQL (PostgreSQL) |
| Cache managed | Memorystore (Redis) |
| Secrets | GCP Secret Manager |
| CI/CD | GitHub Actions → Cloud Run |
| Linting | Ruff + Black |
| Testing | pytest + httpx |

---

## Microservicios internos

| Servicio | Responsabilidad |
|----------|----------------|
| api-gateway | Auth, rate limiting por API key, routing |
| payments-service | Lógica de cobro, máquina de estados, idempotency keys, reconciliación |
| merchants-service | Onboarding, API keys, configuración de comercio |
| medianet-connector | HTTP client hacia MediaNet: auth, retry, circuit breaker |
| notifications-service | Webhooks salientes firmados HMAC-SHA256, cola de reintentos |
| analytics-service | Pipeline de datos + LLM para insights automáticos |

---

## Base de datos — Schema principal

### transactions
```sql
id, merchant_id, amount, currency, status, idempotency_key,
medianet_ref, created_at, updated_at, metadata
```

### merchants
```sql
id, business_name, ruc, email, api_key_public, api_key_secret_hash,
webhook_url, webhook_secret, status, created_at
```

### webhook_events
```sql
id, transaction_id, merchant_id, event_type, payload,
delivered_at, attempts, next_retry_at
```

### api_keys
```sql
id, merchant_id, key_prefix, key_hash, is_active, last_used_at, scope
```

### transaction_logs
```sql
id, transaction_id, from_status, to_status, medianet_raw_response, timestamp
```

### analytics_snapshots
```sql
id, merchant_id, period, total_volume, txn_count, success_rate,
top_hours, generated_at
```

---

## Máquina de estados de transacciones

```
pending → processing → completed
                    ↘ failed
                    ↘ reversed → refunded
```

Nunca actualizar estado directamente — siempre a través de la máquina de estados.
El campo `idempotency_key` tiene índice UNIQUE en PostgreSQL.

---

## Seguridad — Reglas no negociables

1. NUNCA datos de tarjeta en nuestro sistema. La API recibe tokens de MediaNet, no PANs.
2. API keys doble capa: `pk_live_xxx` (pública, frontend) y `sk_live_xxx` (secreta, servidor). La secreta se guarda hasheada con bcrypt.
3. Idempotency keys en todos los endpoints de cobro — el comercio genera UUID por intento.
4. Webhooks salientes firmados con HMAC-SHA256 — header `X-MediaNetPay-Signature`.
5. Rate limiting por API key en Redis — 100 req/min por defecto, configurable.
6. HTTPS everywhere + HSTS max-age=31536000.
7. Secrets en GCP Secret Manager, nunca en código ni en logs.
8. Audit logs inmutables en `transaction_logs` — no se borran.
9. Distributed locks en Redis antes de procesar cobro (idempotency_key como lock key).

---

## Modelo de negocio

| Fuente | Fee |
|--------|-----|
| Comisión por transacción aprobada | 0.3% – 0.5% |
| Mensualidad mínima | $0 |
| Costo de certificación | $0 |
| Tier premium (analytics, soporte prioritario) | Futuro |

Breakeven estimado: $200K/mes procesado.
Margen con $1M/mes procesado: ~$4,000/mes solo de comisión.

---

## Timeline

| Semanas | Fase | Entregable |
|---------|------|-----------|
| 1–2 | Conector MediaNet | Cobro de prueba end-to-end funcionando |
| 3–4 | API core pública | Postman collection contra la API real |
| 5–6 | Portal self-service | Un comercio se registra y ve sus cobros |
| 7–8 | Plugin WooCommerce + Docs | Developer integra en menos de 30 min |
| 9–10 | Beta privada | Primeras transacciones reales |
| 11–12 | QR Code + Link de Cobro + PrestaShop | Todos los features prometidos |
| 13+ | Analytics LLM + Lanzamiento público | Producto en producción |

---

## Convenciones de código

- Python: PEP 8 siempre. Type hints en todo. Docstrings en funciones públicas.
- FastAPI: async/await en todos los endpoints. Pydantic para validación.
- Nunca usar print() para debug. Usar el logger configurado.
- Errores de API retornan JSON estructurado con `code`, `message` y `request_id`.
- Nunca commitear credenciales. GCP Secret Manager para todo.
- Tests obligatorios para toda la lógica de pagos y máquina de estados.

---

## Estado actual

| Componente | Estado |
|------------|--------|
| Backend FastAPI | ✅ Completo — auth, payments, links, webhooks, analytics, refunds, checkout, **softpos** |
| Mock MediaNet | ✅ WebCheckout + **POS card-present** |
| Portal Next.js | ✅ dashboard, analytics, links, settings, reportes |
| App Mobile (React Native + Expo) | ✅ login biométrico, cobro QR, historial, perfil, **SoftPOS datáfono** |
| Integrations | ✅ WooCommerce + PrestaShop plugins + widget.js |
| EAS Build / APK | ✅ APK debug generado con Gradle, corriendo en dispositivo físico |

### SoftPOS — Cómo funciona

Flujo de demo:
1. Home → botón **Datáfono**
2. `SoftPOSScreen` — keypad estilo POS, selector de tarjeta de prueba
3. `CardReadScreen` — activa NFC, muestra "Acerque la tarjeta...", animación de pulso
4. Cliente acerca tarjeta física (cualquier tarjeta con chip NFC) → **beep + vibración**
5. App llama `POST /v1/softpos/charge` → resultado sincrónico
6. `POSResultScreen` — APROBADO/RECHAZADO, código de autorización, botón WhatsApp

Tarjetas de prueba (sin leer el PAN):
- `4242` → Visa aprobada (default cuando NFC detecta)
- `5500` → Mastercard aprobada
- `0002` → Visa rechazada

En producción: SDK certificado Visa/MC reemplaza `card_token` por token EMV del chip.
La arquitectura no cambia.

### Regla para nuevas features

Antes de construir cualquier cosa:
1. Presentar plan con flujo completo + arquitectura
2. Esperar aprobación explícita
3. Solo entonces construir — scope exacto, nada más
