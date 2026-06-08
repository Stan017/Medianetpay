import { createServerApi } from "@/lib/api";
import { formatUSD, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { PaginatedTransactions, AnalyticsSummary, PaymentLink } from "@/lib/types";
import Link from "next/link";
import { VolumeChart } from "./volume-chart";

// ─── Data fetching ─────────────────────────────────────────────────────────

async function getStats() {
  try {
    const api = await createServerApi();

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const prevMonthStart = new Date(monthStart); prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    const [summary, todaySummary, monthSummary, prevMonthSummary, recent, links] = await Promise.all([
      api.get<AnalyticsSummary>("/v1/analytics/summary"),
      api.get<AnalyticsSummary>(`/v1/analytics/summary?date_from=${todayStart.toISOString()}`),
      api.get<AnalyticsSummary>(`/v1/analytics/summary?date_from=${monthStart.toISOString()}`),
      api.get<AnalyticsSummary>(`/v1/analytics/summary?date_from=${prevMonthStart.toISOString()}&date_to=${monthStart.toISOString()}`),
      api.get<PaginatedTransactions>("/v1/transactions?page_size=8"),
      api.get<PaymentLink[]>("/v1/links"),
    ]);

    const monthVol = parseFloat(monthSummary.total_amount_completed);
    const prevMonthVol = parseFloat(prevMonthSummary.total_amount_completed);
    const monthPct = prevMonthVol > 0 ? Math.round(((monthVol - prevMonthVol) / prevMonthVol) * 100) : 0;

    const approvalRate = summary.total_transactions > 0
      ? Math.round((summary.completed_count / summary.total_transactions) * 100)
      : 0;

    const activeLinks = (links ?? []).filter((l: PaymentLink) => l.status === "active");
    const failedRecent = (recent.data ?? []).filter(t => t.status === "failed").length;

    return {
      totalVolume: parseFloat(summary.total_amount_completed),
      todayVolume: parseFloat(todaySummary.total_amount_completed),
      monthVolume: monthVol,
      monthPct,
      totalTxns: summary.total_transactions,
      failedCount: summary.failed_count,
      approvalRate,
      pendingCount: summary.pending_count,
      recent: recent.data ?? [],
      activeLinks,
      failedRecent,
      error: null,
    };
  } catch {
    return {
      totalVolume: 0, todayVolume: 0, monthVolume: 0, monthPct: 0,
      totalTxns: 0, failedCount: 0, approvalRate: 0, pendingCount: 0,
      recent: [], activeLinks: [], failedRecent: 0,
      error: "No se pudieron cargar los datos.",
    };
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const s = await getStats();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  // Mock liquidación (no hay endpoint real aún)
  const pendingLiquidation = s.totalVolume * 0.12;
  const nextLiquidation = new Date(); nextLiquidation.setDate(nextLiquidation.getDate() + (5 - nextLiquidation.getDay() + 7) % 7 || 7);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003358]">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{greeting} · {new Date().toLocaleDateString("es-EC", { weekday:"long", day:"numeric", month:"long" })}</p>
        </div>
        <Link href="/links"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "#F89937" }}>
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo link de cobro
        </Link>
      </div>

      {s.error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{s.error}</div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Cobros hoy"
          value={formatUSD(s.todayVolume)}
          icon="payments"
          color="#0066FF"
          sub={`${s.totalTxns} transacciones totales`}
        />
        <KpiCard
          label="Volumen este mes"
          value={formatUSD(s.monthVolume)}
          icon="trending_up"
          color="#10b981"
          badge={s.monthPct !== 0 ? { value: s.monthPct, positive: s.monthPct >= 0 } : undefined}
          sub="vs. mes anterior"
        />
        <KpiCard
          label="Tasa de aprobación"
          value={`${s.approvalRate}%`}
          icon="verified"
          color={s.approvalRate >= 90 ? "#10b981" : s.approvalRate >= 75 ? "#F89937" : "#ef4444"}
          sub={`${s.failedCount} fallidos · ${s.pendingCount} pendientes`}
        />
        <KpiCard
          label="Por liquidar (est.)"
          value={formatUSD(pendingLiquidation)}
          icon="account_balance"
          color="#8b5cf6"
          sub={`Próx. viernes ${nextLiquidation.toLocaleDateString("es-EC",{day:"numeric",month:"short"})} · estimado`}
        />
      </div>

      {/* ── Chart + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-semibold text-[#003358]">Volumen de ventas</h2>
              <p className="text-xs text-gray-400">Últimos 14 días</p>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg font-medium">USD</span>
          </div>
          <div className="h-44">
            <VolumeChart totalVolume={s.totalVolume} />
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-[#003358]">Alertas</h2>

          {s.failedRecent > 0 ? (
            <AlertItem icon="error" color="#ef4444" bg="#fef2f2" border="#fecaca"
              title={`${s.failedRecent} pago${s.failedRecent > 1 ? "s" : ""} fallido${s.failedRecent > 1 ? "s" : ""}`}
              sub="En las últimas transacciones" href="/transactions" />
          ) : (
            <AlertItem icon="check_circle" color="#10b981" bg="#f0fdf4" border="#bbf7d0"
              title="Sin pagos fallidos" sub="Todo en orden" />
          )}

          {s.pendingCount > 0 && (
            <AlertItem icon="schedule" color="#F89937" bg="#fffbeb" border="#fde68a"
              title={`${s.pendingCount} pago${s.pendingCount > 1 ? "s" : ""} pendiente${s.pendingCount > 1 ? "s" : ""}`}
              sub="Esperando confirmación" href="/transactions" />
          )}

          <AlertItem icon="link_off" color="#8b5cf6" bg="#f5f3ff" border="#ddd6fe"
            title={`${s.activeLinks.length} links activos`}
            sub="Haz clic para gestionar" href="/links" />

          <AlertItem icon="account_balance_wallet" color="#0066FF" bg="#eff6ff" border="#bfdbfe"
            title={`${formatUSD(pendingLiquidation)} por liquidar`}
            sub={`Próximo viernes ${nextLiquidation.toLocaleDateString("es-EC",{day:"numeric",month:"short"})}`} />
        </div>
      </div>

      {/* ── Transacciones + Links ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Transacciones recientes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-[#003358]">Transacciones recientes</h2>
            <Link href="/transactions" className="text-xs font-semibold hover:underline" style={{ color: "#F89937" }}>
              Ver todas →
            </Link>
          </div>
          {s.recent.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-200">receipt_long</span>
              <p className="text-sm text-gray-400 mt-2">Aún no tienes transacciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {s.recent.map(t => (
                <Link key={t.id} href={`/transactions/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    t.status === "completed" ? "bg-green-400" :
                    t.status === "failed"    ? "bg-red-400"   :
                    t.status === "reversed"  ? "bg-purple-400" : "bg-amber-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {t.description ?? "Sin descripción"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {t.customer_email ?? t.id.slice(0, 12) + "..."}
                      {" · "}
                      {new Date(t.created_at).toLocaleDateString("es-EC", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{formatUSD(parseFloat(t.amount))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Links de cobro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-[#003358]">Links activos</h2>
            <Link href="/links" className="text-xs font-semibold hover:underline" style={{ color: "#F89937" }}>Ver todos →</Link>
          </div>

          {s.activeLinks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2">
              <span className="material-symbols-outlined text-4xl text-gray-200">link</span>
              <p className="text-sm text-gray-400">No tienes links activos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 flex-1">
              {s.activeLinks.slice(0, 5).map((l: PaymentLink) => (
                <div key={l.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.description}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-400">
                      {l.uses_count} uso{l.uses_count !== 1 ? "s" : ""}
                      {l.max_uses ? ` / ${l.max_uses}` : ""}
                    </span>
                    <span className="text-sm font-bold text-gray-700">
                      {l.amount ? formatUSD(parseFloat(l.amount)) : "Libre"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-gray-50">
            <Link href="/links"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "#003358" }}>
              <span className="material-symbols-outlined text-lg">add_link</span>
              Crear link de cobro
            </Link>
          </div>
        </div>
      </div>

      {/* ── Notificaciones recientes ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[#003358]">Notificaciones</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: "#F89937" }}>
              {s.failedCount + s.pendingCount}
            </span>
          </div>
          <Link href="/notifications" className="text-xs font-semibold hover:underline" style={{ color: "#F89937" }}>
            Ver todas →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          <NotifRow icon="payments" color="#10b981"
            title={`Volumen acumulado ${formatUSD(s.totalVolume)}`}
            sub="Resumen general de tu cuenta" time="Ahora" />
          {s.failedCount > 0 && (
            <NotifRow icon="error_outline" color="#ef4444"
              title={`${s.failedCount} transacción${s.failedCount > 1 ? "es" : ""} fallida${s.failedCount > 1 ? "s" : ""} en total`}
              sub="Revisa el detalle en Transacciones" time="Hoy" />
          )}
          {s.pendingCount > 0 && (
            <NotifRow icon="schedule" color="#F89937"
              title={`${s.pendingCount} pago${s.pendingCount > 1 ? "s" : ""} pendiente${s.pendingCount > 1 ? "s" : ""} de confirmación`}
              sub="Esperando respuesta del procesador" time="Hoy" />
          )}
          <NotifRow icon="account_balance" color="#8b5cf6"
            title={`Próxima liquidación: ${formatUSD(pendingLiquidation)}`}
            sub={`Se acreditará el viernes ${nextLiquidation.toLocaleDateString("es-EC",{day:"numeric",month:"long"})}`}
            time="Próximamente" />
        </div>
      </div>

    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub, badge }: {
  label: string; value: string; icon: string; color: string;
  sub?: string; badge?: { value: number; positive: boolean };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "18" }}>
          <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
        </div>
        {badge && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {badge.positive ? "+" : ""}{badge.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#003358] leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function AlertItem({ icon, color, bg, border, title, sub, href }: {
  icon: string; color: string; bg: string; border: string;
  title: string; sub: string; href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-xl border transition-all hover:opacity-80"
      style={{ background: bg, borderColor: border }}>
      <span className="material-symbols-outlined text-xl shrink-0 mt-0.5" style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function NotifRow({ icon, color, title, sub, time }: {
  icon: string; color: string; title: string; sub: string; time: string;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + "18" }}>
        <span className="material-symbols-outlined text-base" style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <span className="text-xs text-gray-300 shrink-0 mt-0.5">{time}</span>
    </div>
  );
}
