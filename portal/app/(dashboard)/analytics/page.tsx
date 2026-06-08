import { createServerApi } from "@/lib/api";
import { formatUSD } from "@/lib/utils";
import type { HourlyAnalytics, WeeklyAnalytics, CustomersAnalytics } from "@/lib/types";
import { HourlyChart } from "./hourly-chart";
import { WeeklyChart } from "./weekly-chart";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getAnalytics() {
  try {
    const api = await createServerApi();
    const [hourly, weekly, customers] = await Promise.all([
      api.get<HourlyAnalytics>("/v1/analytics/hourly"),
      api.get<WeeklyAnalytics>("/v1/analytics/weekly"),
      api.get<CustomersAnalytics>("/v1/analytics/customers"),
    ]);
    return { hourly, weekly, customers, error: null };
  } catch {
    return { hourly: null, weekly: null, customers: null, error: "No se pudieron cargar los datos." };
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const { hourly, weekly, customers, error } = await getAnalytics();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#003358]">Análisis de tu negocio</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Patrones reales de tus cobros — cuándo vendes más, quiénes son tus mejores clientes.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* ── Pico de hora y mejor día ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InsightCard
          icon="schedule"
          color="#0066FF"
          label="Tu hora pico"
          value={hourly?.peak_label ?? "—"}
          sub={hourly?.peak_total ? `$${parseFloat(hourly.peak_total).toFixed(2)} promedio en esa hora` : "Sin datos aún"}
        />
        <InsightCard
          icon="calendar_today"
          color="#F89937"
          label="Tu mejor día"
          value={weekly?.best_day ?? "—"}
          sub={weekly?.best_total ? `$${parseFloat(weekly.best_total).toFixed(2)} promedio ese día` : "Sin datos aún"}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Cobros por hora */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-[#003358]">Cobros por hora del día</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {hourly?.peak_label
                ? `Pico a las ${hourly.peak_label} · barra naranja`
                : "Basado en todas tus transacciones completadas"}
            </p>
          </div>
          <div className="h-44">
            {hourly ? (
              <HourlyChart data={hourly.data} peakHour={hourly.peak_hour} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Cobros por día de semana */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-[#003358]">Cobros por día de semana</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {weekly?.best_day
                ? `Mejor día: ${weekly.best_day} · barra naranja`
                : "Basado en todas tus transacciones completadas"}
            </p>
          </div>
          <div className="h-44">
            {weekly ? (
              <WeeklyChart data={weekly.data} bestDay={weekly.best_day} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      {/* ── Clientes frecuentes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#003358]">Clientes frecuentes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Clientes que te han pagado 2 o más veces</p>
          </div>
          {customers && customers.total_repeat > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: "#F89937" }}>
              {customers.total_repeat} clientes
            </span>
          )}
        </div>

        {!customers || customers.data.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-200">group</span>
            <p className="text-sm text-gray-400 mt-2">Aún no tienes clientes frecuentes</p>
            <p className="text-xs text-gray-300 mt-1">
              Aparecerán aquí cuando un cliente te pague por segunda vez
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Header row */}
            <div className="grid grid-cols-12 px-5 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              <span className="col-span-5">Cliente</span>
              <span className="col-span-2 text-center">Pagos</span>
              <span className="col-span-3 text-right">Total pagado</span>
              <span className="col-span-2 text-right">Último pago</span>
            </div>
            {customers.data.map((c, i) => (
              <div
                key={c.ruc_cedula}
                className="grid grid-cols-12 items-center px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Cliente */}
                <div className="col-span-5 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                    style={{ background: i < 3 ? "#F89937" : "#003358" }}
                  >
                    {(c.name ?? c.ruc_cedula).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {c.name ?? "Sin nombre"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{c.ruc_cedula}</p>
                  </div>
                </div>

                {/* Pagos */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-bold text-[#003358]">{c.veces}×</span>
                </div>

                {/* Total */}
                <div className="col-span-3 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {formatUSD(parseFloat(c.total_pagado))}
                  </span>
                </div>

                {/* Último pago */}
                <div className="col-span-2 text-right">
                  <span className="text-xs text-gray-400">
                    {new Date(c.ultimo_pago).toLocaleDateString("es-EC", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InsightCard({ icon, color, label, value, sub }: {
  icon: string; color: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <span className="material-symbols-outlined text-2xl" style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#003358] leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-300">
      Sin datos suficientes
    </div>
  );
}
