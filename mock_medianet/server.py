"""
Mock server de MediaNet — simula el API WebCheckout real.

Corre en localhost:9000.

Flujo real simulado:
  1. POST /app/webservice/webcheckout/rest
     → recibe {key_webservice, username, reference, value, url_back, url_redirect, ...}
     → devuelve {"link": "http://localhost:9000/payment/{token}"}

  2. GET /payment/{token}
     → página HTML con botones Aprobar / Rechazar / Timeout (simulador)

  3. POST /payment/{token}/confirm?action=approved|rejected|timeout
     → hace POST a url_back con resultado (como haría MediaNet real)
     → redirige al cliente a url_redirect

Modo de prueba por monto (igual que el simulador real de MediaNet QA):
  - value < 100  → página muestra "Se aprobará automáticamente" (verde)
  - value >= 100 → página muestra "Se rechazará automáticamente" (rojo)
  Los botones manuales siempre sobreescriben esto.

Reembolsos se mantienen como endpoint directo (MediaNet los maneja aparte).
"""

import asyncio
import secrets
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse

app = FastAPI(title="MediaNet Mock — WebCheckout", docs_url="/docs")

# Almacenamiento en memoria
_sessions: dict[str, dict] = {}   # token → session data
_charges: dict[str, dict] = {}    # ref → charge data (para refunds)


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "medianet-mock-webcheckout"}


# ── WebCheckout — crear sesión de pago ────────────────────────────────────────

@app.post("/app/webservice/webcheckout/rest")
async def create_webcheckout(request: Request) -> dict:
    """
    Recibe los datos del comercio, devuelve un link de pago.
    Equivale al endpoint productivo:
      https://api.medianetpay.ec:4443/app/webservice/webcheckout/rest
    """
    body = await request.json()

    key = body.get("key_webservice", "")
    username = body.get("username", "")
    reference = body.get("reference", "")
    value = float(body.get("value", 0))
    currency = body.get("currency", "USD")
    description = body.get("description", "")
    url_back = body.get("url_back", "")
    url_redirect = body.get("url_redirect", "")
    person_data = body.get("person_data", {})
    iva = body.get("iva", 15)

    # Validaciones básicas
    if not key or not username:
        raise HTTPException(status_code=401, detail={
            "code": "invalid_credentials",
            "message": "key_webservice o username inválidos",
        })
    if not reference:
        raise HTTPException(status_code=422, detail={
            "code": "missing_reference",
            "message": "El campo reference es obligatorio",
        })
    if value <= 0:
        raise HTTPException(status_code=422, detail={
            "code": "invalid_value",
            "message": "El valor debe ser mayor a 0",
        })
    if not url_back:
        raise HTTPException(status_code=422, detail={
            "code": "missing_url_back",
            "message": "El campo url_back es obligatorio",
        })

    # Generar token de sesión (equivale al token en el link de MediaNet)
    token = secrets.token_urlsafe(24)

    _sessions[token] = {
        "token": token,
        "reference": reference,
        "value": value,
        "currency": currency,
        "description": description,
        "url_back": url_back,
        "url_redirect": url_redirect,
        "person_data": person_data,
        "iva": iva,
        "username": username,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
    }

    base_url = str(request.base_url).rstrip("/")
    payment_link = f"{base_url}/payment/{token}"
    return {"link": payment_link}


# ── Página de pago simulada ────────────────────────────────────────────────────

@app.get("/payment/{token}", response_class=HTMLResponse)
async def payment_page(token: str) -> HTMLResponse:
    session = _sessions.get(token)
    if not session:
        return HTMLResponse("<h2>Sesión de pago no encontrada o expirada</h2>", status_code=404)
    if session["status"] != "pending":
        return HTMLResponse("<h2>Esta sesión de pago ya fue procesada</h2>", status_code=410)

    value = session["value"]
    currency = session["currency"]
    description = session["description"]
    auto_hint = ""
    if value < 100:
        auto_hint = '<div style="background:#d1fae5;border:1px solid #6ee7b7;padding:10px 14px;border-radius:8px;color:#065f46;font-size:13px;margin-bottom:16px;">✅ Simulador: montos menores a $100 se aprueban automáticamente.</div>'
    else:
        auto_hint = '<div style="background:#fee2e2;border:1px solid #fca5a5;padding:10px 14px;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:16px;">❌ Simulador: montos ≥ $100 se rechazan automáticamente.</div>'

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediaNetPay — Pago de prueba</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}}
    .card{{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.10);width:100%;max-width:400px;overflow:hidden}}
    .header{{background:#1a56db;padding:24px;color:#fff;text-align:center}}
    .header-label{{font-size:11px;opacity:.7;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}}
    .header-amount{{font-size:40px;font-weight:800}}
    .header-desc{{font-size:14px;opacity:.85;margin-top:6px}}
    .body{{padding:24px}}
    .mock-badge{{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:10px 14px;font-size:12px;color:#713f12;margin-bottom:16px;text-align:center;font-weight:600}}
    .btn{{width:100%;padding:13px;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;transition:opacity .15s}}
    .btn-approve{{background:#16a34a;color:#fff}}
    .btn-approve:hover{{opacity:.88}}
    .btn-reject{{background:#dc2626;color:#fff}}
    .btn-reject:hover{{opacity:.88}}
    .btn-timeout{{background:#9ca3af;color:#fff;font-size:13px}}
    .btn-timeout:hover{{opacity:.88}}
    .ref{{text-align:center;font-size:11px;color:#9ca3af;margin-top:12px;font-family:monospace}}
  </style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="header-label">🔒 MediaNetPay — Modo Prueba</div>
    <div class="header-amount">${value:.2f} {currency}</div>
    <div class="header-desc">{description}</div>
  </div>
  <div class="body">
    <div class="mock-badge">⚡ Simulador de pagos — elige el resultado</div>
    {auto_hint}
    <form method="POST" action="/payment/{token}/confirm">
      <input type="hidden" name="action" value="approved">
      <button type="submit" class="btn btn-approve">✅ Aprobar pago</button>
    </form>
    <form method="POST" action="/payment/{token}/confirm">
      <input type="hidden" name="action" value="rejected">
      <button type="submit" class="btn btn-reject">❌ Rechazar pago</button>
    </form>
    <form method="POST" action="/payment/{token}/confirm">
      <input type="hidden" name="action" value="timeout">
      <button type="submit" class="btn btn-timeout">⏱ Simular timeout (sin respuesta)</button>
    </form>
    <div class="ref">Ref: {session["reference"]}</div>
  </div>
</div>
</body>
</html>"""
    return HTMLResponse(content=html)


# ── Confirmar pago (el usuario clickea un botón en el simulador) ───────────────

@app.post("/payment/{token}/confirm")
async def confirm_payment(token: str, request: Request):
    """
    Procesa la decisión del simulador:
    1. Marca la sesión como procesada
    2. POSTea a url_back (como haría MediaNet real)
    3. Redirige al url_redirect
    """
    form = await request.form()
    action = form.get("action", "approved")

    session = _sessions.get(token)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if session["status"] != "pending":
        raise HTTPException(status_code=409, detail="Sesión ya procesada")

    if action == "timeout":
        # No llamamos url_back — simulamos que MediaNet no responde
        session["status"] = "timeout"
        return HTMLResponse(
            "<div style='font-family:sans-serif;padding:40px;text-align:center'>"
            "<h2>⏱ Timeout simulado</h2>"
            "<p style='color:#6b7280;margin-top:8px'>MediaNet no respondió — la transacción queda en <b>pending</b>.</p>"
            "</div>"
        )

    # Marcar sesión
    session["status"] = "processed"
    response_str = "Aprobada" if action == "approved" else "Rechazada"
    payment_ref = f"MN-{uuid.uuid4().hex[:12].upper()}"
    authorization = uuid.uuid4().hex[:6].upper() if action == "approved" else None

    # Guardar para consultas posteriores
    _charges[payment_ref] = {
        "ref": payment_ref,
        "reference": session["reference"],
        "status": "completed" if action == "approved" else "failed",
        "amount": str(session["value"]),
        "currency": session["currency"],
        "response": response_str,
        "method": "VISA",
    }

    # Payload que MediaNet envía a url_back
    callback_payload = {
        "response": response_str,
        "reference": session["reference"],
        "currency": session["currency"],
        "amount": str(session["value"]),
        "method": "VISA",
        "payment_reference": payment_ref,
        "authorization": authorization,
        "deferred": None,
        "deferred_term": None,
        "other_term": None,
    }

    # POST asíncrono a url_back (fuego y olvido — como hace MediaNet real)
    url_back = session["url_back"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url_back, json=callback_payload)
    except Exception as exc:
        # Si el callback falla, lo registramos pero seguimos con el redirect
        print(f"[mock] WARN: url_back callback falló: {exc}")

    # Redirigir al comercio
    url_redirect = session.get("url_redirect", "")
    if url_redirect:
        sep = "&" if "?" in url_redirect else "?"
        redirect_to = f"{url_redirect}{sep}response={response_str}&payment_reference={payment_ref}"
        return RedirectResponse(url=redirect_to, status_code=303)

    return HTMLResponse(
        f"<div style='font-family:sans-serif;padding:40px;text-align:center'>"
        f"<h2>{'✅ Pago aprobado' if action == 'approved' else '❌ Pago rechazado'}</h2>"
        f"<p style='color:#6b7280;margin-top:8px'>Referencia: {payment_ref}</p>"
        f"</div>"
    )


# ── SoftPOS — cobro con tarjeta presente (sincrónico) ────────────────────────

_SOFTPOS_CARDS = {
    "4242": {"approved": True,  "brand": "VISA",       "last4": "4242"},
    "0002": {"approved": False, "brand": "VISA",       "last4": "0002"},
    "5500": {"approved": True,  "brand": "MASTERCARD", "last4": "5500"},
}


@app.post("/app/webservice/pos/charge")
async def card_present_charge(request: Request) -> dict:
    """
    Endpoint card-present sincrónico para el SoftPOS móvil.
    En producción este endpoint recibiría el token EMV encriptado del chip.
    En simulación, el campo card_token determina el resultado.
    """
    body = await request.json()

    key      = body.get("key_webservice", "")
    username = body.get("username", "")
    if not key or not username:
        raise HTTPException(status_code=401, detail={"code": "invalid_credentials"})

    reference  = body.get("reference", "")
    value      = float(body.get("value", 0))
    currency   = body.get("currency", "USD")
    card_token = str(body.get("card_token", "4242")).strip()

    card = _SOFTPOS_CARDS.get(card_token, _SOFTPOS_CARDS["4242"])
    payment_ref = f"MN-POS-{uuid.uuid4().hex[:10].upper()}"
    authorization = uuid.uuid4().hex[:6].upper() if card["approved"] else None

    _charges[payment_ref] = {
        "ref":       payment_ref,
        "reference": reference,
        "status":    "completed" if card["approved"] else "failed",
        "amount":    str(value),
        "currency":  currency,
        "method":    card["brand"],
    }

    return {
        "status":            "approved" if card["approved"] else "declined",
        "payment_reference": payment_ref,
        "authorization":     authorization,
        "card_brand":        card["brand"],
        "card_last4":        card["last4"],
        "amount":            str(value),
        "currency":          currency,
        "reference":         reference,
    }


# ── Refunds — se mantienen como endpoint directo ───────────────────────────────

@app.post("/api/v1/refunds")
async def create_refund(request: Request) -> dict:
    body = await request.json()
    charge_ref = body.get("charge_ref", "")
    amount = body.get("amount", "0")
    reason = body.get("reason", "")

    charge = _charges.get(charge_ref)
    if not charge:
        raise HTTPException(status_code=404, detail={"message": f"Cobro {charge_ref} no encontrado"})

    if float(amount) > float(charge["amount"]):
        raise HTTPException(status_code=422, detail={
            "code": "amount_exceeds_charge",
            "message": "El monto del reembolso supera el cobro original",
        })

    ref = f"RF-{uuid.uuid4().hex[:12].upper()}"
    return {
        "ref": ref,
        "charge_ref": charge_ref,
        "status": "completed",
        "amount": amount,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000, log_level="info")
