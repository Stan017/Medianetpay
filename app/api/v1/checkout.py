"""
Checkout público — página HTML + endpoint de cobro WebCheckout.

GET  /pay/{token}           → página HTML: muestra monto + botón "Pagar con MediaNet"
POST /pay/{token}/charge    → crea txn pending, obtiene link de MediaNet, devuelve redirect_url
GET  /payment-result        → página de resultado final (success/pending/failed)
"""

import html
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.modules.links.service import get_link_by_token
from app.modules.links.checkout_service import public_charge
from app.schemas.checkout import PublicChargeRequest, PublicChargeResponse
from app.utils.rate_limiter import limiter

router = APIRouter(tags=["Checkout Público"])


# ── Página principal de checkout ──────────────────────────────────────────────

@router.get("/pay/{token}", response_class=HTMLResponse, include_in_schema=False)
@limiter.limit("60/minute")
async def checkout_page(
    request: Request,
    token: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Página pública de checkout. Muestra el monto y redirige a MediaNet."""
    from datetime import datetime, timezone

    link = await get_link_by_token(db, token)
    if not link:
        return HTMLResponse(_error_page("Link no encontrado"), status_code=404)
    if link.status != "active":
        return HTMLResponse(_error_page("Este link ya no está activo"), status_code=410)
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        return HTMLResponse(_error_page("Este link ha expirado"), status_code=410)
    if link.max_uses is not None and link.uses_count >= link.max_uses:
        return HTMLResponse(_error_page("Este link ha alcanzado el máximo de usos"), status_code=410)

    from app.models.merchant import Merchant
    merchant = await db.get(Merchant, link.merchant_id)
    is_test = merchant.test_mode if merchant else True

    has_fixed_amount = link.amount is not None
    fixed_amount_js = str(link.amount) if link.amount is not None else "null"

    test_hint = (
        '<div class="test-hint">🧪 <b>Modo prueba.</b> '
        'Serás redirigido al simulador de pagos de MediaNet.</div>'
        if is_test else ""
    )

    safe_desc = html.escape(link.description)
    if has_fixed_amount:
        # Header con monto fijo grande
        header_content = f"""
    <div class="header-badge">🔒 Pago seguro · MediaNetPay</div>
    <div class="header-desc">{safe_desc}</div>
    <div class="header-amount"><span>$</span>{link.amount:.2f}</div>
    <div class="header-currency">{link.currency}</div>"""
        # Campo de monto: no se muestra (fijo)
        amount_field = ""
        initial_btn_label = f"Continuar al pago · ${link.amount:.2f} {link.currency}"
    else:
        # Header sin monto — el cliente lo elige
        header_content = f"""
    <div class="header-badge">🔒 Pago seguro · MediaNetPay</div>
    <div class="header-desc">{safe_desc}</div>
    <div class="header-free-label">¿Cuánto quieres pagar?</div>"""
        # Campo de monto prominente
        amount_field = """
    <div class="field amount-free-field">
      <label>Monto (USD) *</label>
      <div class="amount-input-wrap">
        <span class="amount-prefix">$</span>
        <input id="f-amount" type="number" placeholder="0.00" min="0.01" step="0.01"
               inputmode="decimal" oninput="updateBtn(this.value)">
      </div>
    </div>"""
        initial_btn_label = "Ingresar monto para continuar"

    _page = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagar — {safe_desc}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}}
    .card{{background:#fff;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.10);width:100%;max-width:420px;overflow:hidden}}
    .header{{background:linear-gradient(135deg,#1a56db 0%,#1e40af 100%);padding:28px 24px;color:#fff;text-align:center}}
    .header-badge{{font-size:11px;font-weight:600;letter-spacing:.08em;opacity:.75;margin-bottom:10px;text-transform:uppercase}}
    .header-desc{{font-size:15px;font-weight:500;opacity:.9;margin-bottom:10px}}
    .header-amount{{font-size:40px;font-weight:800;line-height:1}}
    .header-amount span{{font-size:18px;font-weight:600;opacity:.8;vertical-align:super}}
    .header-currency{{font-size:13px;opacity:.7;margin-top:4px}}
    .header-free-label{{font-size:22px;font-weight:700;opacity:.95;margin-top:4px;letter-spacing:-.01em}}
    .body{{padding:24px}}
    .field{{margin-bottom:16px}}
    label{{display:block;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}}
    input{{width:100%;padding:11px 13px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s}}
    input:focus{{border-color:#1a56db;box-shadow:0 0 0 3px rgba(26,86,219,.12)}}
    .amount-free-field label{{color:#1a56db}}
    .amount-input-wrap{{position:relative}}
    .amount-prefix{{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:18px;font-weight:700;color:#374151;pointer-events:none}}
    .amount-free-field input{{padding-left:30px;font-size:20px;font-weight:700;border-color:#1a56db;border-width:2px}}
    .amount-free-field input:focus{{box-shadow:0 0 0 3px rgba(26,86,219,.15)}}
    .btn{{width:100%;padding:14px;background:#1a56db;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;transition:background .15s,transform .1s,opacity .15s}}
    .btn:hover:not(:disabled){{background:#1e40af;transform:translateY(-1px)}}
    .btn:disabled{{background:#9ca3af;cursor:not-allowed;transform:none}}
    .secure{{text-align:center;font-size:12px;color:#9ca3af;margin-top:14px}}
    .alert{{padding:11px 13px;border-radius:8px;font-size:13px;margin-bottom:14px;display:none}}
    .alert-error{{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}}
    .test-hint{{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;margin-bottom:16px}}
    .redirect-info{{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;font-size:13px;color:#1e40af;margin-bottom:16px;text-align:center}}
    .divider{{font-size:11px;font-weight:600;color:#d1d5db;text-transform:uppercase;letter-spacing:.08em;margin:4px 0 12px;display:flex;align-items:center;gap:8px}}
    .divider::before,.divider::after{{content:'';flex:1;height:1px;background:#f3f4f6}}
  </style>
</head>
<body>
<div class="card">
  <div class="header">{header_content}
  </div>
  <div class="body">
    {test_hint}
    <div id="alert" class="alert alert-error"></div>

    <div class="redirect-info">
      Serás redirigido a la página segura de pago de MediaNet para completar tu transacción.
    </div>

    {amount_field}

    <div class="divider">datos del pagador (opcional)</div>

    <div class="field">
      <label>Nombre completo</label>
      <input id="f-name" type="text" placeholder="Juan Pérez" autocomplete="name">
    </div>
    <div class="field">
      <label>Email</label>
      <input id="f-email" type="email" placeholder="tu@correo.com" autocomplete="email">
    </div>
    <div class="field">
      <label>Cédula / RUC</label>
      <input id="f-ruc" type="text" placeholder="1712345678" maxlength="13" inputmode="numeric">
    </div>

    <button id="pay-btn" class="btn" onclick="submit()">{initial_btn_label}</button>
    <p class="secure">🔒 Pago procesado por MediaNet · PCI DSS Certificado</p>
  </div>
</div>

<script>
  var TOKEN = {json.dumps(token)};
  var FIXED_AMOUNT = {fixed_amount_js};
  var EMBED_MODE = (new URLSearchParams(window.location.search)).get('mode') === 'embed';
  var DEFAULT_BTN = {json.dumps(initial_btn_label)};

  function showAlert(msg) {{
    var el = document.getElementById('alert');
    el.textContent = msg;
    el.style.display = 'block';
  }}

  // Actualiza el label del botón mientras el usuario escribe el monto
  function updateBtn(val) {{
    var btn = document.getElementById('pay-btn');
    var n = parseFloat(val);
    if (n && n > 0) {{
      btn.textContent = 'Continuar al pago · $' + n.toFixed(2) + ' USD';
      btn.disabled = false;
    }} else {{
      btn.textContent = 'Ingresar monto para continuar';
      btn.disabled = false;
    }}
  }}

  function submit() {{
    document.getElementById('alert').style.display = 'none';
    var btn = document.getElementById('pay-btn');
    var amount = FIXED_AMOUNT;
    if (!amount) {{
      var el = document.getElementById('f-amount');
      amount = el ? parseFloat(el.value) : 0;
      if (!amount || amount <= 0) {{
        showAlert('Ingresa un monto válido.');
        el && el.focus();
        return;
      }}
    }}

    btn.disabled = true;
    btn.textContent = 'Redirigiendo...';

    var key = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();

    fetch('/pay/' + TOKEN + '/charge', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{
        amount: amount,
        customer_email: document.getElementById('f-email').value.trim() || null,
        customer_name: document.getElementById('f-name').value.trim() || null,
        customer_ruc_cedula: document.getElementById('f-ruc').value.trim() || null,
        idempotency_key: key,
      }})
    }})
    .then(function(res) {{ return res.json().then(function(d) {{ return {{ok: res.ok, data: d}}; }}); }})
    .then(function(r) {{
      if (!r.ok) {{
        var msg = (r.data && r.data.detail && r.data.detail.message) || 'Error procesando el pago.';
        showAlert(msg);
        btn.disabled = false;
        btn.textContent = DEFAULT_BTN;
        return;
      }}
      var dest = r.data.redirect_url;
      if (EMBED_MODE && window.top && window.top !== window) {{
        window.top.location.href = dest;
      }} else {{
        window.location.href = dest;
      }}
    }})
    .catch(function() {{
      showAlert('Error de conexión. Verifica tu internet e intenta nuevamente.');
      btn.disabled = false;
      btn.textContent = DEFAULT_BTN;
    }});
  }}
</script>
</body>
</html>"""
    return HTMLResponse(content=_page)


# ── Página de resultado final ─────────────────────────────────────────────────

@router.get("/payment-result", response_class=HTMLResponse, include_in_schema=False)
async def payment_result_page(
    txn: str | None = Query(default=None),
    result: str | None = Query(default=None),
    response: str | None = Query(default=None),          # MediaNet envía: "Aprobada" | "Rechazada"
    payment_reference: str | None = Query(default=None),  # MediaNet envía: MN-XXXXX
) -> HTMLResponse:
    """
    Página de resultado final tras el pago en MediaNet.

    MediaNet redirige aquí con query params:
      ?response=Aprobada&payment_reference=MN-XXXXX
    O también puede usarse ?result=success|failed|pending para navegación interna.
    """
    # MediaNet envía ?response=Aprobada|Rechazada — tiene prioridad
    if response:
        computed = response.strip().lower()
        display = "success" if computed in ("aprobada", "approved", "aprobado") else "failed"
    elif result:
        display = result
    else:
        display = "pending"

    return _render_result_page(display, txn)


def _render_result_page(result: str, txn_id: str | None) -> HTMLResponse:
    if result in ("success", "aprobada", "approved"):
        icon, title, subtitle, color = "✅", "¡Pago exitoso!", "Tu pago fue procesado correctamente.", "#16a34a"
    elif result in ("failed", "rechazada", "rejected"):
        icon, title, subtitle, color = "❌", "Pago no procesado", "Tu pago fue rechazado. Intenta con otra tarjeta.", "#dc2626"
    else:
        icon, title, subtitle, color = "⏳", "Pago en proceso", "Estamos verificando tu pago. Recibirás una confirmación pronto.", "#d97706"

    ref = f'<p style="font-size:12px;color:#9ca3af;margin-top:8px;font-family:monospace">{html.escape(txn_id)}</p>' if txn_id else ""
    _page = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediaNetPay — {title}</title>
  <style>
    body{{font-family:-apple-system,sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center}}
    .card{{background:#fff;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.10);padding:48px 32px;text-align:center;max-width:380px;width:100%;margin:16px}}
    .icon{{font-size:64px;line-height:1;margin-bottom:16px}}
    h2{{font-size:22px;font-weight:800;color:#111;margin-bottom:8px}}
    p{{font-size:14px;color:#6b7280;line-height:1.5}}
    .badge{{display:inline-block;margin-top:20px;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:700;color:#fff;background:{color}}}
  </style>
</head>
<body>
<div class="card">
  <div class="icon">{icon}</div>
  <h2>{title}</h2>
  <p>{subtitle}</p>
  {ref}
  <div class="badge">MediaNetPay</div>
</div>
</body>
</html>"""
    return HTMLResponse(content=_page)


def _error_page(message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Error</title>
<style>body{{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f4f8}}
.card{{background:#fff;border-radius:16px;padding:40px;text-align:center;max-width:360px;box-shadow:0 4px 20px rgba(0,0,0,.08)}}
h2{{color:#dc2626;margin-bottom:8px}}p{{color:#6b7280;font-size:14px}}</style></head>
<body><div class="card"><h2>⚠️ {message}</h2><p>Si crees que esto es un error, contacta al comercio.</p></div></body></html>"""


# ── Endpoint de cobro (sin autenticación) ─────────────────────────────────────

@router.post(
    "/pay/{token}/charge",
    response_model=PublicChargeResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("10/minute")
async def checkout_charge(
    request: Request,
    token: str,
    body: PublicChargeRequest,
    db: AsyncSession = Depends(get_db),
) -> PublicChargeResponse:
    """
    Inicia el pago WebCheckout. Devuelve redirect_url — el frontend redirige al cliente ahí.
    La transacción queda en 'pending' hasta que MediaNet confirme el pago via webhook.
    """
    try:
        result = await public_charge(
            db,
            token=token,
            amount=body.amount,
            customer_email=body.customer_email,
            customer_name=body.customer_name,
            customer_ruc_cedula=body.customer_ruc_cedula,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "checkout_error", "message": str(exc)},
        )

    if result["status"] == "failed":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "medianet_error", "message": "No se pudo conectar con el procesador de pagos. Intenta nuevamente."},
        )

    return PublicChargeResponse(**result)
