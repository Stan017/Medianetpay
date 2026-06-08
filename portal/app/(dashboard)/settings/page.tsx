import { createServerApi } from "@/lib/api";
import type { MerchantProfile } from "@/lib/types";
import { SettingsTabs } from "./settings-tabs";

async function getProfile(): Promise<MerchantProfile | null> {
  try {
    const api = await createServerApi();
    return await api.get<MerchantProfile>("/v1/auth/me");
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003358]">Ajustes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestiona tu perfil, seguridad e integraciones</p>
      </div>
      <SettingsTabs profile={profile} />
    </div>
  );
}
