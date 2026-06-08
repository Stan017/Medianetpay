"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { MerchantProfile } from "@/lib/types";

export function ConfigTab({ profile }: { profile: MerchantProfile | null }) {
  // ── API Keys ──────────────────────────────────────────────────────────────
  const [copiedPk, setCopiedPk] = useState(false);

  function copy(value: string, set: (v: boolean) => void) {
    navigator.clipboard.writeText(value).then(() => { set(true); setTimeout(() => set(false), 2000); });
  }

  // ── Webhook ───────────────────────────────────────────────────────────────
  const [webhook, setWebhook] = useState({
    webhook_url: profile?.webhook_url ?? "",
    webhook_secret: "",
  });
  const [whSaving, setWhSaving] = useState(false);
  const [whOk, setWhOk] = useState(false);
  const [whErr, setWhErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWhSaving(true); setWhErr(null); setWhOk(false);
    try {
      await api.put("/v1/auth/webhook", webhook);
      setWhOk(true);
      setTimeout(() => setWhOk(false), 3000);
    } catch (err) {
      setWhErr(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setWhSaving(false);
    }
  }

  async function testWebhook() {
    setTestResult(null); setTesting(true);
    try {
      await api.post("/v1/webhooks/test", {});
      setTestResult("ok");
    } catch (err) {
      setTestResult("err:" + (err instanceof ApiError ? err.message : "Error"));
    } finally {
      setTesting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all";

  return (
    <div className="space-y-5">

      {/* API Keys */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">API Keys</h2>

        {/* Public key */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500">Clave publica</label>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#003358" + "18", color: "#003358" }}>
              segura para frontend
            </span>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
            <code className="text-xs font-mono text-gray-700 flex-1 break-all">{profile?.api_key_public ?? "—"}</code>
            <button onClick={() => copy(profile?.api_key_public ?? "", setCopiedPk)} className="shrink-0">
              <span className="material-symbols-outlined text-sm" style={{ color: copiedPk ? "#10b981" : "#9ca3af" }}>
                {copiedPk ? "check_circle" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* Secret key */}
        <div className="rounded-xl border p-4" style={{ borderColor: "#F8993740", background: "#FFF9F0" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base" style={{ color: "#F89937" }}>warning</span>
            <span className="text-xs font-semibold" style={{ color: "#92400e" }}>Clave secreta (sk_test)</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#F8993720", color: "#92400e" }}>
              solo en servidor
            </span>
          </div>
          <p className="text-xs" style={{ color: "#92400e" }}>
            La clave secreta solo se muestra al registrarse. Si la perdiste, escribe a{" "}
            <strong>soporte@medianetpay.ec</strong> desde tu email para regenerarla.
          </p>
        </div>
      </div>

      {/* Webhook */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#003358" + "15" }}>
            <span className="material-symbols-outlined text-lg" style={{ color: "#003358" }}>webhook</span>
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Webhook</h2>
            <p className="text-xs text-gray-400">Notificaciones en tiempo real a tu servidor</p>
          </div>
        </div>

        <form onSubmit={saveWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">URL del endpoint</label>
            <input
              type="url"
              required
              value={webhook.webhook_url}
              onChange={(e) => setWebhook({ ...webhook, webhook_url: e.target.value })}
              placeholder="https://mi-tienda.com/webhooks/medianetpay"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Webhook secret <span className="text-gray-300 font-normal">(deja vacio para no cambiar)</span>
            </label>
            <input
              type="text"
              value={webhook.webhook_secret}
              onChange={(e) => setWebhook({ ...webhook, webhook_secret: e.target.value })}
              placeholder="Nueva clave HMAC..."
              className={inputCls}
            />
            <p className="text-xs text-gray-300 mt-1">
              Encabezado: <code className="bg-gray-100 px-1 rounded">X-MediaNetPay-Signature: sha256=...</code>
            </p>
          </div>

          {whErr && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{whErr}</p>}
          {whOk  && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">Webhook guardado correctamente</p>}
          {testResult && (
            <p className={`text-sm rounded-xl px-4 py-2.5 ${testResult === "ok" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
              {testResult === "ok" ? "Webhook enviado — revisa tu endpoint" : testResult.replace("err:", "")}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={whSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: whOk ? "#10b981" : "#F89937" }}
            >
              {whSaving ? "Guardando..." : whOk ? "Guardado" : "Guardar webhook"}
            </button>
            <button
              type="button"
              onClick={testWebhook}
              disabled={testing || !webhook.webhook_url}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
            >
              {testing ? "Enviando..." : "Probar"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
