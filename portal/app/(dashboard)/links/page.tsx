import { createServerApi } from "@/lib/api";
import type { PaymentLink } from "@/lib/types";
import { LinksClient } from "./links-client";

async function getLinks(): Promise<PaymentLink[]> {
  try {
    const api = await createServerApi();
    return await api.get<PaymentLink[]>("/v1/links");
  } catch {
    return [];
  }
}

export default async function LinksPage() {
  const links = await getLinks();

  // KPI calculations
  const active   = links.filter((l) => l.status === "active").length;
  const inactive = links.filter((l) => l.status === "inactive").length;
  const expired  = links.filter((l) => l.status === "expired").length;
  const totalUses = links.reduce((s, l) => s + (l.uses_count ?? 0), 0);
  const topLink  = links.length
    ? links.reduce((a, b) => (a.uses_count ?? 0) >= (b.uses_count ?? 0) ? a : b)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003358]">Links de Cobro</h1>
          <p className="text-sm text-gray-400 mt-0.5">Genera links de pago y comparte con tus clientes</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="link" label="Links activos" value={active} color="#10b981" />
        <KpiCard icon="touch_app" label="Usos totales" value={totalUses} color="#003358" />
        <KpiCard icon="block" label="Inactivos / Vencidos" value={`${inactive + expired}`} color="#9ca3af" />
        <KpiCard
          icon="bar_chart"
          label="Link mas usado"
          value={topLink ? `${topLink.uses_count} uso${topLink.uses_count !== 1 ? "s" : ""}` : "—"}
          sub={topLink?.description?.slice(0, 22) ?? ""}
          color="#F89937"
        />
      </div>

      {/* Interactive table + create modal */}
      <LinksClient links={links} />
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <span className="material-symbols-outlined text-lg" style={{ color }}>{icon}</span>
        </div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#003358]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
