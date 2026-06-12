/**
 * Mock API server para tests de Playwright.
 * Corre en puerto 9001. El portal apunta aquí via NEXT_PUBLIC_API_URL.
 * Intercepta tanto llamadas SSR (server→server) como client-side.
 */

const http = require("http");

// ── JWT falso válido para getAuthUser() ──────────────────────────────────────
// getAuthUser() en lib/auth.ts solo decodifica el payload SIN verificar firma.
const JWT_PAYLOAD = {
  sub: "test-merchant-id",
  email: "comercio@test.com",
  exp: Math.floor(Date.now() / 1000) + 86400, // 24h
};
const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
const payload = Buffer.from(JSON.stringify(JWT_PAYLOAD)).toString("base64url");
const FAKE_JWT = `${header}.${payload}.fakesignature`;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SUMMARY = {
  total_transactions: 42,
  completed_count: 38,
  failed_count: 3,
  pending_count: 1,
  reversed_count: 0,
  total_amount_completed: "1250.00",
  currency: "USD",
  date_from: null,
  date_to: null,
};

const TRANSACTIONS = {
  data: [
    {
      id: "txn-001",
      merchant_id: "test-merchant-id",
      amount: "25.00",
      currency: "USD",
      status: "completed",
      payment_method: "card",
      installments: 1,
      idempotency_key: "idem-001",
      medianet_ref: "MN-001",
      description: "Cobro de prueba",
      customer_email: "cliente@test.com",
      customer_name: "Juan Pérez",
      customer_ruc_cedula: null,
      customer_id_type: null,
      customer_phone: null,
      customer_address: null,
      invoice_status: null,
      metadata: {},
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
  ],
  total: 1,
  page: 1,
  page_size: 8,
};

const LINKS = [
  {
    id: "link-001",
    token: "tok-abc123",
    amount: "50.00",
    currency: "USD",
    description: "Servicio de peluquería",
    expires_at: null,
    max_uses: null,
    uses_count: 3,
    status: "active",
    qr_png_url: null,
    checkout_url: "http://localhost:9001/pay/tok-abc123",
    created_at: "2024-01-10T10:00:00Z",
  },
];

const PROFILE = {
  merchant_id: "test-merchant-id",
  business_name: "Comercio de Prueba",
  ruc: "1234567890001",
  email: "comercio@test.com",
  webhook_url: null,
  webhook_secret: null,
  status: "active",
  test_mode: true,
  api_key_public: "pk_test_abc123",
  created_at: "2024-01-01T00:00:00Z",
};

const NOTIFICATIONS = { items: [], unread_count: 0 };

const HOURLY  = { data: [], peak_hour: null, peak_label: null, peak_total: "0.00" };
const WEEKLY  = { data: [], peak_dow: null, peak_label: null, peak_total: "0.00" };
const DAILY   = { data: [], peak_date: null, peak_total: "0.00" };

// ── Router ────────────────────────────────────────────────────────────────────

function route(req, res) {
  const url  = req.url ?? "/";
  const method = req.method ?? "GET";

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Auth
  if (method === "POST" && url === "/v1/auth/login") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { email, password } = JSON.parse(body || "{}");
      if (email === "comercio@test.com" && password === "testpass123") {
        res.writeHead(200);
        res.end(JSON.stringify({ access_token: FAKE_JWT }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ detail: { code: "invalid_credentials", message: "Credenciales incorrectas" } }));
      }
    });
    return;
  }

  if (method === "POST" && url === "/v1/auth/logout") {
    res.writeHead(200); res.end("{}"); return;
  }

  if (method === "GET" && url === "/v1/auth/me") {
    res.writeHead(200); res.end(JSON.stringify(PROFILE)); return;
  }

  // Transactions
  if (method === "GET" && url.startsWith("/v1/transactions")) {
    res.writeHead(200); res.end(JSON.stringify(TRANSACTIONS)); return;
  }

  // Analytics
  if (method === "GET" && url.startsWith("/v1/analytics/summary")) {
    res.writeHead(200); res.end(JSON.stringify(SUMMARY)); return;
  }
  if (method === "GET" && url.startsWith("/v1/analytics/hourly")) {
    res.writeHead(200); res.end(JSON.stringify(HOURLY)); return;
  }
  if (method === "GET" && url.startsWith("/v1/analytics/weekly")) {
    res.writeHead(200); res.end(JSON.stringify(WEEKLY)); return;
  }
  if (method === "GET" && url.startsWith("/v1/analytics/daily")) {
    res.writeHead(200); res.end(JSON.stringify(DAILY)); return;
  }

  // Links
  if (method === "GET" && url.startsWith("/v1/links")) {
    res.writeHead(200); res.end(JSON.stringify(LINKS)); return;
  }
  if (method === "POST" && url === "/v1/links") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const data = JSON.parse(body || "{}");
      const newLink = {
        id: "link-new-001",
        token: "tok-new123",
        amount: data.amount ? String(data.amount) : null,
        currency: "USD",
        description: data.description || "Nuevo link",
        expires_at: null,
        max_uses: null,
        uses_count: 0,
        status: "active",
        qr_png_url: null,
        checkout_url: "http://localhost:9001/pay/tok-new123",
        created_at: new Date().toISOString(),
      };
      res.writeHead(201); res.end(JSON.stringify(newLink));
    });
    return;
  }

  // Analytics — endpoints adicionales (customers, daily ya cubierto arriba)
  if (method === "GET" && url.startsWith("/v1/analytics/customers")) {
    res.writeHead(200);
    res.end(JSON.stringify({ data: [], total_repeat: 0, top_customers: [] }));
    return;
  }

  // Catalog / Vitrina
  if (method === "GET" && url === "/v1/catalog") {
    res.writeHead(200);
    res.end(JSON.stringify({
      slug: null, bio: null, profile_image_url: null,
      vitrina_active: false, vitrina_url: null, services: [],
    }));
    return;
  }
  if (method === "GET" && url.startsWith("/v1/catalog/services")) {
    res.writeHead(200); res.end(JSON.stringify([])); return;
  }
  if (method === "POST" && url === "/v1/catalog/activate") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { active } = JSON.parse(body || "{}");
      res.writeHead(200);
      res.end(JSON.stringify({
        vitrina_active: active,
        slug: active ? "comercio-de-prueba" : null,
        vitrina_url: active ? "http://localhost:3001/v/comercio-de-prueba" : null,
      }));
    });
    return;
  }
  if (method === "PUT" && url === "/v1/catalog/profile") {
    res.writeHead(200); res.end(JSON.stringify({ bio: null, profile_image_url: null })); return;
  }
  if (method === "POST" && url === "/v1/catalog/services") {
    res.writeHead(201);
    res.end(JSON.stringify({
      id: "svc-001", name: "Nuevo servicio", price: "25.00",
      active: true, payment_link_token: "tok-svc",
    }));
    return;
  }

  // Notifications
  if (method === "GET" && url.startsWith("/v1/notifications")) {
    res.writeHead(200); res.end(JSON.stringify(NOTIFICATIONS)); return;
  }

  // Settings / webhook — api.put("/v1/auth/webhook", body)
  if (method === "PUT" && url === "/v1/auth/webhook") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const data = JSON.parse(body || "{}");
      res.writeHead(200);
      res.end(JSON.stringify({ ...PROFILE, webhook_url: data.webhook_url ?? "https://hook.test.com/cb" }));
    });
    return;
  }

  // Test webhook
  if (method === "POST" && url === "/v1/webhooks/test") {
    res.writeHead(200); res.end("{}"); return;
  }

  // Catch-all
  res.writeHead(404);
  res.end(JSON.stringify({ detail: { code: "not_found", message: `Not found: ${method} ${url}` } }));
}

const server = http.createServer(route);
server.listen(9001, () => {
  console.log("Mock API running on http://localhost:9001");
});

// Graceful shutdown
process.on("SIGTERM", () => server.close());
process.on("SIGINT",  () => server.close());
