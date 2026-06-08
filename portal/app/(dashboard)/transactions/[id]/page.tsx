import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerApi } from "@/lib/api";
import { formatUSD, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { Transaction, TransactionLog } from "@/lib/types";

interface FraudFactor { count?: number; failed_count?: number; ratio?: number; avg_usd?: number; score: number; detail?: string; }
interface FraudScore {
  score: number;
  label: string;
  color: string;
  factors: {
    velocity?: FraudFactor;
    amount?: FraudFactor;
    history?: FraudFactor;
  };
}
import { RefundButton } from "./refund-button";
import { ReceiptButtons } from "./receipt-buttons";

interface Props { params: Promise<{ id: string }> }

function initials(name?: string | null, email?: string | null) {
  if (name) return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function shortId(id: string, ref?: string | null) {
  if (ref) return ref.toUpperCase();
  return "TX-" + id.slice(0, 6).toUpperCase();
}


function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TIMELINE_LABELS: Record<string, { label: string; icon: string }> = {
  pending:    { label: "Pago iniciado",            icon: "play_circle" },
  processing: { label: "Procesando pago",          icon: "sync" },
  completed:  { label: "Pago autorizado",          icon: "check_circle" },
  failed:     { label: "Pago rechazado",           icon: "cancel" },
  reversed:   { label: "Pago revertido",           icon: "undo" },
  refunded:   { label: "Reembolso procesado",      icon: "currency_exchange" },
};

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params;
  const api = await createServerApi();

  let txn: Transaction;
  let logs: TransactionLog[] = [];

  try { txn = await api.get<Transaction>(`/v1/transactions/${id}`); }
  catch { notFound(); }

  // fetch logs and fraud score in parallel
  const [logsResult, fraudResult] = await Promise.allSettled([
    api.get<TransactionLog[]>(`/v1/transactions/${id}/logs`),
    api.get<FraudScore>(`/v1/transactions/${id}/fraud-score`),
  ]);

  logs = logsResult.status === "fulfilled" ? logsResult.value : [];
  const fraud: FraudScore = fraudResult.status === "fulfilled"
    ? fraudResult.value
    : { score: 0, label: "Sin datos", color: "#9ca3af", factors: {} };

  const score = fraud.score;
  const scoreColor = fraud.color;
  const scoreLabel = fraud.label;
  const ini = initials(txn.customer_name, txn.customer_email);
  const txId = shortId(id, txn.medianet_ref);
  const ip = (txn.metadata?.ip as string) ?? "—";
  const location = (txn.metadata?.location as string) ?? "Ecuador";
  const bank = (txn.metadata?.bank as string) ?? "—";
  const cardType = txn.payment_method?.toLowerCase().includes("credit") ? "Crédito"
    : txn.payment_method?.toLowerCase().includes("debit") ? "Débito" : "—";

  return (
    <div className="space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/transactions" className="hover:text-[#003358] transition-colors">Transacciones</Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        <span className="text-[#003358] font-semibold">#{txId}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[txn.status] ?? ""}`}>
              ● {STATUS_LABELS[txn.status] ?? txn.status}
            </span>
            <span className="text-gray-400 text-sm font-mono">{txId}</span>
          </div>
          <p className="text-4xl font-bold text-[#003358]">
            {formatUSD(parseFloat(txn.amount))}
            <span className="text-lg font-normal text-gray-400 ml-2">{txn.currency}</span>
          </p>
        </div>
        {/* Acciones */}
        <div className="flex flex-col gap-2 min-w-[280px]">
          {txn.status === "completed" && (
            <RefundButton transaction={txn} />
          )}
          <ReceiptButtons
            transactionId={txn.id}
            txRef={(txn.medianet_ref ?? txn.id.slice(0, 8)).toUpperCase()}
          />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-5">

          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información del Cliente</h2>
              {(txn.customer_ruc_cedula || txn.customer_email) && (
                <Link
                  href={`/transactions?q=${encodeURIComponent(txn.customer_ruc_cedula ?? txn.customer_email ?? "")}`}
                  className="flex items-center gap-1 text-xs font-semibold hover:underline"
                  style={{ color: "#0066FF" }}
                >
                  Ver historial
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: "#003358" }}>
                {ini}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <DataField label="Nombre Completo" value={txn.customer_name ?? "—"} />
                <DataField label="Email" value={txn.customer_email ?? "—"} />
                {txn.customer_ruc_cedula && txn.customer_id_type !== "consumidor_final" && (
                  <DataField
                    label={txn.customer_id_type === "ruc" ? "RUC" : txn.customer_id_type === "pasaporte" ? "Pasaporte" : "Cédula"}
                    value={txn.customer_ruc_cedula}
                  />
                )}
                {txn.customer_phone && (
                  <DataField label="Teléfono" value={txn.customer_phone} />
                )}
                {txn.customer_address && (
                  <DataField label="Dirección" value={txn.customer_address} />
                )}
                {txn.description && (
                  <DataField label="Descripción" value={txn.description} />
                )}
                {txn.invoice_status && (
                  <DataField
                    label="Factura SRI"
                    value={
                      txn.invoice_status === "emitted" ? "Emitida" :
                      txn.invoice_status === "authorized" ? "Autorizada" :
                      txn.invoice_status === "cancelled" ? "Anulada" : txn.invoice_status
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* Detalles de pago */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Detalles de Pago</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-gray-400 mb-1">Método de Pago</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {txn.payment_method ?? "—"}
                  </span>
                </div>
              </div>
              <DataField label="Tipo de Tarjeta" value={cardType} />
              <DataField label="Banco Emisor" value={bank} />
              <DataField label="Código Autorización" value={txn.medianet_ref ?? "—"} mono />
              <DataField label="Cuotas" value={txn.installments > 1 ? `${txn.installments} cuotas` : "Pago único"} />
              <DataField label="Fecha y Hora" value={formatDateTime(txn.created_at)} />
            </div>
          </div>

          {/* Seguridad y Riesgo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Seguridad y Riesgo</h2>

            {/* Score principal */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Score de Fraude</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold" style={{ color: scoreColor }}>{score}/100</span>
                    <span className="material-symbols-outlined text-base" style={{ color: scoreColor }}>
                      {score < 30 ? "verified_user" : score < 65 ? "shield" : "gpp_bad"}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor }} />
                </div>
                <p className="text-xs font-semibold mt-1" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
            </div>

            {/* Breakdown por factor */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <FactorCard
                icon="bolt"
                label="Velocidad"
                detail={fraud.factors.velocity
                  ? fraud.factors.velocity.count === 0
                    ? "Sin actividad reciente"
                    : `${fraud.factors.velocity.count} txn${(fraud.factors.velocity.count ?? 0) > 1 ? "s" : ""} en la ultima hora`
                  : "—"}
                pts={fraud.factors.velocity?.score ?? 0}
                max={40}
              />
              <FactorCard
                icon="monitoring"
                label="Monto"
                detail={fraud.factors.amount?.ratio != null
                  ? `${fraud.factors.amount.ratio}x el promedio ($${fraud.factors.amount.avg_usd})`
                  : "Sin historial base"}
                pts={fraud.factors.amount?.score ?? 0}
                max={35}
              />
              <FactorCard
                icon="credit_card_off"
                label="Historial"
                detail={fraud.factors.history
                  ? fraud.factors.history.failed_count === 0
                    ? "Sin fallos previos"
                    : `${fraud.factors.history.failed_count} fallo${(fraud.factors.history.failed_count ?? 0) > 1 ? "s" : ""} con este metodo`
                  : "—"}
                pts={fraud.factors.history?.score ?? 0}
                max={25}
              />
            </div>

            {/* IP y ubicacion */}
            <div className="flex gap-6 pt-4 border-t border-gray-50">
              <DataField label="Direccion IP" value={ip} mono />
              <DataField label="Ubicacion" value={location} icon="location_on" />
            </div>
          </div>
        </div>

        {/* Cronología */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Cronología</h2>

          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-gray-200">history</span>
              <p className="text-xs text-gray-400 mt-2">Sin historial disponible</p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-gray-100" />
              <div className="space-y-6">
                {[...logs].reverse().map((log, i) => {
                  const info = TIMELINE_LABELS[log.to_status] ?? { label: log.to_status, icon: "radio_button_checked" };
                  const isFirst = i === 0;
                  return (
                    <div key={log.id} className="flex gap-4 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${isFirst ? "shadow-md" : ""}`}
                        style={{ background: isFirst ? "#003358" : "#f3f4f6" }}>
                        <span className="material-symbols-outlined text-sm"
                          style={{ color: isFirst ? "#fff" : "#9ca3af", fontSize: "14px" }}>
                          {info.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={`text-sm font-semibold ${isFirst ? "text-[#003358]" : "text-gray-500"}`}>
                          {info.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.created_at)}</p>
                        {log.triggered_by && (
                          <p className="text-xs text-gray-300 mt-0.5">por {log.triggered_by}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ID completo al fondo */}
          <div className="mt-8 pt-5 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-1">ID de transacción</p>
            <p className="text-xs font-mono text-gray-500 break-all">{txn.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, mono = false, icon }: {
  label: string; value: string; mono?: boolean; icon?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold text-gray-800 flex items-center gap-1 ${mono ? "font-mono" : ""}`}>
        {icon && <span className="material-symbols-outlined text-sm text-gray-400">{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function FactorCard({ icon, label, detail, pts, max }: {
  icon: string; label: string; detail: string; pts: number; max: number;
}) {
  const pct = Math.round((pts / max) * 100);
  const color = pts === 0 ? "#10b981" : pts < max * 0.5 ? "#F89937" : "#ef4444";
  return (
    <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-base text-gray-400">{icon}</span>
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="ml-auto text-xs font-bold" style={{ color }}>{pts}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-400 leading-tight">{detail}</p>
    </div>
  );
}
