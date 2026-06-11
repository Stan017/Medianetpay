# MediaNetPay

[![Deploy to Cloud Run](https://github.com/Stan017/Medianetpay/actions/workflows/deploy.yml/badge.svg)](https://github.com/Stan017/Medianetpay/actions/workflows/deploy.yml)

**Open-source payment gateway for Ecuador** — built on top of MediaNet S.A.'s 19-year processing infrastructure (Produbanco, Banco Bolivariano, Banco Internacional).

> MediaNet already operates 10,000+ POS terminals across Ecuador. MediaNetPay is the digital layer: API, merchant portal, mobile SoftPOS, checkout widget, and e-commerce plugins — all from scratch, in 10 weeks to beta.

---

## Screenshots

**Landing page**

![Landing](docs/screenshots/homepage.png)

**Merchant portal**

| Dashboard | Mi Vitrina |
|-----------|-----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Vitrina](docs/screenshots/vitrina-portal.png) |

**Mobile app**

<p align="center">
  <img src="docs/screenshots/mobile-login.jpeg" width="18%" />
  <img src="docs/screenshots/mobile-home.jpeg" width="18%" />
  <img src="docs/screenshots/mobile-nfc.jpeg" width="18%" />
  <img src="docs/screenshots/mobile-approved.jpeg" width="18%" />
  <img src="docs/screenshots/mobile-vitrina.jpeg" width="18%" />
</p>

---

## What's included

| Layer | What it does |
|-------|-------------|
| **REST API** (FastAPI) | Auth, payments, payment links, QR, refunds, webhooks, analytics, SoftPOS |
| **Merchant Portal** (Next.js 15) | Dashboard, transaction history, payment links, vitrina (storefront), analytics, settings |
| **Mobile App** (React Native + Expo) | SoftPOS tap-to-pay (NFC), QR charging, notifications, storefront |
| **Checkout Widget** | Embeddable JS snippet + hosted checkout page |
| **E-commerce Plugins** | WooCommerce, PrestaShop, OpenCart, VirtueMart |
| **Mock MediaNet Server** | Local + Cloud Run simulator for end-to-end testing without live credentials |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
│  Next.js Portal  │  React Native App  │  Merchant JS │
└──────────┬───────────────┬───────────────┬───────────┘
           │               │               │
           └───────────────▼───────────────┘
                    FastAPI Backend
          ┌─────────────────────────────────┐
          │  Auth  │  Payments  │  Links    │
          │  Webhooks  │  Analytics  │  AI  │
          └──────────────┬──────────────────┘
                         │
              ┌──────────▼──────────┐
              │  MediaNet Connector  │
              │  (HTTP + retry +    │
              │   circuit breaker)  │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  MediaNet S.A.      │
              │  (existing switch,  │
              │   clearing, fraud)  │
              └─────────────────────┘
```

**Persistence:** PostgreSQL 16 (Cloud SQL) · Redis (optional, Upstash)  
**Deploy:** GCP Cloud Run · Artifact Registry · Workload Identity Federation (no JSON keys)  
**CI/CD:** GitHub Actions → Docker build → Cloud Run

---

## Tech stack

```
Backend     FastAPI 0.115 · Python 3.12 · SQLAlchemy 2 async · asyncpg · Alembic
Frontend    Next.js 15 · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query v5
Mobile      React Native · Expo SDK 52 · Zustand · expo-secure-store · NFC
Auth        JWT (python-jose) · bcrypt · NextAuth.js v5
Infra       GCP Cloud Run · Cloud SQL · GitHub Actions
AI          Anthropic Claude (merchant analytics insights + Annie chatbot)
```

---

## Features

### Payment flows
- **WebCheckout** — hosted payment page, redirect flow, HMAC-signed callbacks
- **Payment Links** — shareable links with fixed or open amounts, expiry, usage limits
- **QR Codes** — dynamic QR per transaction, scannable by any banking app
- **SoftPOS** — NFC tap-to-pay directly from a smartphone (no hardware needed)
- **Refunds** — full and partial, with audit trail

### Merchant experience
- Self-service onboarding with RUC validation
- Dual API keys: `pk_` (public/frontend) and `sk_` (secret/server)
- Webhook delivery with HMAC-SHA256 signatures + retry queue
- Real-time transaction dashboard with Recharts
- LLM-powered analytics: Claude generates automatic insights per merchant
- Public storefront (`/v/[slug]`) — catalog of services with payment links

### Security
- No card data ever touches our system — we receive MediaNet tokens, not PANs
- SSRF protection on webhook URLs (blocks private IPs and internal services)
- Rate limiting on all public endpoints (slowapi, per-IP)
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-Request-ID
- Idempotency keys on all charge endpoints (UUID, DB-unique index)
- Atomic uses_count enforcement (SQL UPDATE with WHERE guard)
- Secrets in GCP Secret Manager — never in code or logs

---

## Getting started

### Prerequisites
- Python 3.12
- Node.js 20+
- PostgreSQL 16 (or a Supabase project)
- Docker (optional, for the mock server)

### 1. Clone & install backend
```bash
git clone https://github.com/Stan017/Medianetpay.git
cd Medianetpay
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 2. Configure environment
```bash
cp .env.example .env   # edit with your values
```

Key variables:
```
SECRET_KEY=        # openssl rand -hex 32
DATABASE_URL=      # postgresql+asyncpg://user:pass@host/db
MEDIANET_API_URL=  # http://localhost:9000 for local mock
```

### 3. Run migrations & start backend
```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 4. Start the mock MediaNet server (local testing)
```bash
uvicorn mock_medianet.server:app --port 9000
```

**Alternatively — start backend + mock together with Docker Compose:**
```bash
docker compose up          # backend on :8000, mock on :9000
docker compose up -d       # background
docker compose logs -f api # stream backend logs
```
> Note: on Windows/WSL2, Docker can't route IPv6 to Supabase. Use the manual steps above for local Windows dev.

### 5. Start the merchant portal
```bash
cd portal
npm install
npm run dev   # http://localhost:3000
```

### 6. Start the mobile app
```bash
cd app-mobile
npm install
npx expo start
```

---

## API reference

Interactive docs available at `/docs` when running locally.

### Core endpoints

```
POST /v1/auth/register               Create merchant account
POST /v1/auth/login                  Get JWT token
GET  /v1/auth/me                     Merchant profile

POST /v1/charges                     Initiate a payment
GET  /v1/charges/{id}                Get transaction status
POST /v1/refunds                     Issue a refund
GET  /v1/refunds/{id}                Get refund status

POST /v1/links                       Create a payment link
GET  /v1/links                       List payment links
GET  /pay/{token}                    Hosted checkout page (public)
POST /pay/{token}/charge             Process checkout payment (public)

POST /v1/softpos/charge              NFC tap-to-pay charge

GET  /v1/transactions                Transaction history (with filters)

GET  /v1/analytics/summary           Volume, success rate, conversion
GET  /v1/analytics/hourly            Hourly transaction breakdown
GET  /v1/analytics/weekly            Weekly trend chart
GET  /v1/analytics/customers         Top customers + repeat rate

POST /v1/webhooks/test               Fire a test webhook to your endpoint
GET  /v1/notifications               In-app merchant notifications
POST /v1/chat                        Annie — AI assistant (public, no auth)

GET  /v1/public/vitrina/{slug}       Public merchant storefront (no auth)
```

### Authentication
```
X-API-Key: sk_test_...    # secret key — server-side operations
X-API-Key: pk_test_...    # public key — read-only
Authorization: Bearer <jwt>  # portal / mobile sessions
```

---

## SoftPOS

The mobile app turns any NFC-enabled Android phone into a payment terminal.

```
1. Merchant opens Datáfono screen
2. Enters amount on keypad
3. Customer taps their card (NFC)
4. App sends POST /v1/softpos/charge
5. Instant APPROVED / DECLINED result
6. One-tap WhatsApp receipt
```

Test cards (simulator):
| Last 4 | Result |
|--------|--------|
| `4242` | Visa — Approved |
| `5500` | Mastercard — Approved |
| `0002` | Visa — Declined |

In production: a certified Visa/MC SDK replaces the test token with a real EMV chip token. The API contract stays identical.

---

## E-commerce plugins

| Platform | Location |
|----------|----------|
| WooCommerce | `integrations/woocommerce/` |
| PrestaShop | `integrations/prestashop/` |
| OpenCart | `integrations/opencart/` |
| VirtueMart | `integrations/virtuemart/` |

Each plugin handles: payment initiation, redirect to hosted checkout, callback processing, order status update.

---

## Deployment

The project deploys automatically to GCP Cloud Run on every push to `main`.

```
GitHub push → Actions → Docker build → Artifact Registry → Cloud Run deploy
```

Required GitHub secrets:

```
GCP_PROJECT_ID      GCP_WIF_PROVIDER     GCP_SA_EMAIL
GCP_REGION          GCP_AR_REPO
SECRET_KEY          DATABASE_URL         REDIS_URL
MEDIANET_API_URL    MEDIANET_API_KEY     MEDIANET_API_SECRET
MEDIANET_API_USERNAME
PORTAL_BASE_URL     API_BASE_URL
```

Auth uses **Workload Identity Federation** — no service account JSON keys stored anywhere.

---

## Transaction state machine

```
pending → processing → completed
                    ↘ failed
                    ↘ reversed → refunded
```

State transitions go through a dedicated service. Direct DB status writes are never allowed.

---

## Project status

| Component | Status |
|-----------|--------|
| Backend API | ✅ Production (Cloud Run) |
| Merchant Portal | ✅ Production (Cloud Run) |
| Mock MediaNet Server | ✅ Production (Cloud Run) |
| Mobile App (Android) | ✅ Debug APK — physical device tested |
| WooCommerce plugin | ✅ Complete |
| PrestaShop plugin | ✅ Complete |
| Real MediaNet credentials | ⏳ Pending — integration with live switch |
| Public beta | ⏳ Q3 2026 |

---

## Built by

**Stanley Llaguno** — for MediaNet S.A., Ecuador  
[LinkedIn](https://www.linkedin.com/in/stanley-llaguno-7737b724b/) · [YouTube](https://youtube.com/@notstan17)

---

*MediaNetPay is built on top of MediaNet S.A.'s existing banking infrastructure. The card processing, clearing, and fraud systems belong to MediaNet. This repository covers the API layer, merchant tooling, and digital products built on top of that infrastructure.*
