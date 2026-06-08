"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ReportesPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateTo(to.toISOString().slice(0, 10));
    setDateFrom(from.toISOString().slice(0, 10));
    setActivePreset(days);
  }
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.set("date_to", end.toISOString());
      }
      const data = await apiClient.get<AnalyticsSummary>(`/v1/analytics/summary?${params}`);
      setSummary(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el resumen. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      params.set("date_to", end.toISOString());
    }
    // Abre directamente el endpoint del backend — el navegador descarga gracias a
    // Content-Disposition: attachment. La cookie de sesión se envía porque es mismo origen
    // (localhost:8000 tiene la cookie y el link es absoluto a ese origen).
    window.open(`${API_BASE}/v1/transactions/export?${params}`, "_blank");
  }

  const statCards = summary
    ? [
        {
          label: "Total cobrado",
          value: `$${parseFloat(summary.total_amount_completed).toFixed(2)}`,
          icon: TrendingUp,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Completadas",
          value: summary.completed_count,
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Fallidas",
          value: summary.failed_count,
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-50",
        },
        {
          label: "Pendientes",
          value: summary.pending_count,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
      ]
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003358]">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Descarga tu historial de cobros para contabilidad y declaraciones SRI.
        </p>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-[#003358] mb-4">Rango de fechas</h2>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {[7, 15, 30].map((days) => (
            <button
              key={days}
              onClick={() => applyPreset(days)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={activePreset === days
                ? { background: "#F89937", color: "#fff", borderColor: "#F89937" }
                : { background: "#fff", color: "#003358", borderColor: "#e5e7eb" }
              }
            >
              Ultimos {days} dias
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset(null); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20"
            />
          </div>
          <button
            onClick={loadSummary}
            disabled={loading}
            className="px-5 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-all active:scale-95"
            style={{ background: "#003358" }}
          >
            {loading ? "Cargando..." : "Ver resumen"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Tarjetas de resumen */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
          <div className="col-span-2 lg:col-span-4 bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">Total transacciones en período</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.total_transactions}</p>
          </div>
        </div>
      )}

      {/* Descarga CSV */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl" style={{ background: "#F8993718" }}>
            <FileSpreadsheet size={24} style={{ color: "#F89937" }} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Exportar a CSV</h2>
            <p className="text-sm text-gray-500 mt-1">
              Descarga todas tus transacciones con los campos necesarios para el SRI:
              fecha, monto, descripción, RUC/cédula del pagador y referencia.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
              {["Fecha", "ID", "Referencia", "Descripción", "Estado", "Monto USD", "Email", "Nombre", "RUC/Cédula"].map(
                (col) => (
                  <span key={col} className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                    {col}
                  </span>
                )
              )}
            </div>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: "#003358" }}
          >
            <Download size={15} />
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
