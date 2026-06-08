"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export function WebhookForm({ initialUrl }: { initialUrl: string }) {
  const [form, setForm] = useState({ webhook_url: initialUrl, webhook_secret: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await api.put("/v1/auth/webhook", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTestResult(null);
    setTesting(true);
    try {
      await api.post("/v1/webhooks/test", {});
      setTestResult("✓ Webhook enviado — revisa tu endpoint");
    } catch (err) {
      setTestResult("✗ " + (err instanceof ApiError ? err.message : "Error enviando webhook"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL del endpoint</label>
        <input
          type="url"
          required
          value={form.webhook_url}
          onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
          placeholder="https://mi-tienda.com/webhooks/medianetpay"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook secret (para validar firma HMAC)
        </label>
        <input
          type="text"
          value={form.webhook_secret}
          onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
          placeholder="Nueva clave secreta (mín. 8 caracteres)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Verifica los eventos con: <code className="bg-gray-100 px-1 rounded">X-MediaNetPay-Signature: sha256=…</code>
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {testResult && (
        <p className={`text-sm rounded-lg px-3 py-2 ${testResult.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {testResult}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !form.webhook_url}
          className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {testing ? "Enviando..." : "Probar"}
        </button>
      </div>
    </form>
  );
}
