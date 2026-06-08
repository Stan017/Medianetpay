import { createServerApi } from "@/lib/api";
import { VitrinaClient } from "./vitrina-client";
import type { VitrinaData } from "./types";

async function getVitrina(): Promise<VitrinaData> {
  try {
    const api = await createServerApi();
    return await api.get<VitrinaData>("/v1/catalog");
  } catch {
    return {
      slug: null,
      bio: null,
      profile_image_url: null,
      vitrina_active: false,
      vitrina_url: null,
      services: [],
    };
  }
}

export default async function VitrinaPage() {
  const vitrina = await getVitrina();
  const activeServices = vitrina.services.filter((s) => s.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003358]">Mi Vitrina</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Tu página pública de servicios — compártela con tus clientes
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={vitrina.vitrina_active ? "storefront" : "store"}
          label="Estado"
          value={vitrina.vitrina_active ? "Activa" : "Inactiva"}
          color={vitrina.vitrina_active ? "#10b981" : "#9ca3af"}
        />
        <KpiCard
          icon="shopping_bag"
          label="Servicios activos"
          value={`${activeServices.length} / 10`}
          color="#003358"
        />
        <KpiCard
          icon="link"
          label="URL pública"
          value={vitrina.slug ? "Disponible" : "Sin generar"}
          sub={vitrina.slug ?? "Activa la vitrina"}
          color="#F89937"
        />
        <KpiCard
          icon="image"
          label="Perfil"
          value={vitrina.profile_image_url ? "Completo" : "Falta foto"}
          sub={vitrina.bio ? "Bio configurada" : "Sin descripción"}
          color={vitrina.profile_image_url && vitrina.bio ? "#10b981" : "#F89937"}
        />
      </div>

      {/* Client interactivo */}
      <VitrinaClient initial={vitrina} />
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <span className="material-symbols-outlined text-lg" style={{ color }}>
            {icon}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#003358]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
