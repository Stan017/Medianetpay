"use client";

import { useState } from "react";
import type { MerchantProfile } from "@/lib/types";
import { ProfileTab } from "./profile-tab";
import { ConfigTab } from "./config-tab";

const TABS = [
  { id: "perfil",  label: "Perfil",         icon: "person" },
  { id: "config",  label: "Configuracion",  icon: "settings" },
] as const;

type TabId = typeof TABS[number]["id"];

export function SettingsTabs({ profile }: { profile: MerchantProfile | null }) {
  const [active, setActive] = useState<TabId>("perfil");

  return (
    <div>
      {/* Pill tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={active === tab.id
              ? { background: "#fff", color: "#003358", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { background: "transparent", color: "#9ca3af" }
            }
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {active === "perfil" && <ProfileTab profile={profile} />}
      {active === "config" && <ConfigTab profile={profile} />}
    </div>
  );
}
