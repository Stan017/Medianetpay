import Link from "next/link";
import { Suspense } from "react";
import { createServerApi } from "@/lib/api";
import { formatUSD, STATUS_LABELS } from "@/lib/utils";
import type { PaginatedTransactions, AnalyticsSummary } from "@/lib/types";
import { TransactionsFilters } from "./transactions-filters";
import { TransactionsTable } from "./transactions-table";

interface Props {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const params  = await searchParams;
  const page    = parseInt(params.page ?? "1", 10);
  const status  = params.status ?? "";
  const q       = params.q ?? "";

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", "15");
  if (status) qs.set("status", status);
  if (q)      qs.set("q", q);

  let result: PaginatedTransactions = { data: [], total: 0, page: 1, page_size: 15, total_pages: 1 };
  let summary: AnalyticsSummary | null = null;
  let fetchError: string | null = null;

  try {
    const api = await createServerApi();
    [result, summary] = await Promise.all([
      api.get<PaginatedTransactions>(`/v1/transactions?${qs}`),
      // El summary siempre refleja totales globales (el endpoint no soporta filtro de status)
      api.get<AnalyticsSummary>("/v1/analytics/summary"),
    ]);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Error al cargar transacciones";
  }

  // La búsqueda ya viene filtrada del backend — usar directo
  const filtered = result.data;

  const approvalRate = summary && summary.total_transactions > 0
    ? Math.round((summary.completed_count / summary.total_transactions) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#003358]">Transacciones</h1>
        <p className="text-sm text-gray-400 mt-0.5">Historial completo de cobros procesados</p>
      </div>

      {/* Resumen del período */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Total cobrado"
            value={formatUSD(parseFloat(summary.total_amount_completed))}
            icon="payments" color="#10b981"
          />
          <SummaryCard
            label={status ? `${STATUS_LABELS[status] ?? status}s` : "Transacciones"}
            value={String(summary.total_transactions)}
            icon="receipt_long" color="#0066FF"
          />
          <SummaryCard
            label="Tasa de aprobación"
            value={`${approvalRate}%`}
            icon="verified"
            color={approvalRate >= 90 ? "#10b981" : approvalRate >= 75 ? "#F89937" : "#ef4444"}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <Suspense>
          <TransactionsFilters currentStatus={status} currentQ={q} />
        </Suspense>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {fetchError ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-red-300">error_outline</span>
            <p className="text-sm text-red-500 mt-2">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-200">receipt_long</span>
            <p className="text-sm text-gray-400 mt-2">No hay transacciones con los filtros seleccionados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Método</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Monto</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <TransactionsTable rows={filtered} />
          </table>
        )}
      </div>

      {/* Paginación */}
      {result.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {result.total} transacciones · Página {result.page} de {result.total_pages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/transactions?page=${result.page - 1}${status ? `&status=${status}` : ""}${q ? `&q=${q}` : ""}`}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-600"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span> Anterior
              </Link>
            )}
            {result.page < result.total_pages && (
              <Link
                href={`/transactions?page=${result.page + 1}${status ? `&status=${status}` : ""}${q ? `&q=${q}` : ""}`}
                className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-white transition-all hover:opacity-90"
                style={{ background: "#003358" }}
              >
                Siguiente <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-[#003358]">{value}</p>
      </div>
    </div>
  );
}
