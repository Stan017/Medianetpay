"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { PaymentLink } from "@/lib/types";

export function CreateLinkForm() {
  const router = useRouter();
  const [freeAmount, setFreeAmount] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    max_uses: "",
    expires_at: "",
  });
  const [result, setResult] = useState<PaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { description: form.description };
      if (!freeAmount && form.amount) body.amount = parseFloat(form.amount);
      if (form.max_uses) body.max_uses = parseInt(form.max_uses, 10);
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();

      const link = await api.post<PaymentLink>("/v1/links", body);
      setResult(link);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setFreeAmount(false);
    setForm({ description: "", amount: "", max_uses: "", expires_at: "" });
    setError(null);
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (result) {
    const isLibre = result.amount === null;
    return (
      <div className="space-y-4">
        {/* Tipo de link */}
        <div className={`rounded-xl p-3 border ${isLibre ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{isLibre ? "🔓" : "✅"}</span>
            <p className={`text-sm font-semibold ${isLibre ? "text-amber-800" : "text-green-800"}`}>
              {isLibre ? "Link de monto libre creado" : `Link de $${parseFloat(result.amount!).toFixed(2)} creado`}
            </p>
          </div>
          {isLibre && (
            <p className="text-xs text-amber-700 mb-2">
              El cliente elige cuánto pagar al escanear el QR.
            </p>
          )}
          <code className={`text-xs break-all ${isLibre ? "text-amber-700" : "text-green-700"}`}>
            {result.checkout_url}
          </code>
        </div>

        {/* QR */}
        {result.qr_png_url && (
          <div className="flex flex-col items-center gap-2 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.qr_png_url}
              alt="QR de cobro"
              width={160}
              height={160}
              className="rounded-xl border border-gray-200 shadow-sm"
            />
            <a
              href={result.qr_png_url}
              download={`qr-${result.token ?? "link"}.png`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              ↓ Descargar QR
            </a>
          </div>
        )}

        <button
          onClick={handleReset}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Crear otro link
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Descripción *
        </label>
        <input
          type="text"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Almuerzo, producto, servicio..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Toggle monto */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Tipo de cobro
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFreeAmount(false)}
            className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
              !freeAmount
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            💰 Monto fijo
          </button>
          <button
            type="button"
            onClick={() => { setFreeAmount(true); setForm({ ...form, amount: "" }); }}
            className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
              freeAmount
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            🔓 Monto libre
          </button>
        </div>

        {/* Input monto fijo */}
        {!freeAmount && (
          <div className="mt-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Explicación monto libre */}
        {freeAmount && (
          <div className="mt-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 leading-relaxed">
              El cliente ingresa el monto al escanear el QR. Ideal para peluquerías, tiendas con precios variables o cobros de servicios.
            </p>
          </div>
        )}
      </div>

      {/* Opciones avanzadas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Máx. usos
          </label>
          <input
            type="number"
            min="1"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            placeholder="Sin límite"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Vencimiento
          </label>
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
        style={{ background: loading ? undefined : "#0066FF" }}
      >
        {loading ? "Creando..." : "Crear link + QR"}
      </button>
    </form>
  );
}
