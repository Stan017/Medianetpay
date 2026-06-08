"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { MerchantProfile } from "@/lib/types";

export function ProfileTab({ profile }: { profile: MerchantProfile | null }) {
  const router = useRouter();

  // ── Perfil form ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    business_name: profile?.business_name ?? "",
    email: profile?.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveErr(null); setSaveOk(false);
    try {
      await api.put("/v1/auth/profile", form);
      setSaveOk(true);
      setTimeout(() => { setSaveOk(false); router.refresh(); }, 2000);
    } catch (err) {
      setSaveErr(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // ── Password form ─────────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) {
      setPwdErr("Las contrasenas no coinciden"); return;
    }
    if (pwd.next.length < 8) {
      setPwdErr("La nueva contrasena debe tener al menos 8 caracteres"); return;
    }
    setPwdSaving(true); setPwdErr(null); setPwdOk(false);
    try {
      await api.put("/v1/auth/password", { current_password: pwd.current, new_password: pwd.next });
      setPwdOk(true);
      setPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdOk(false), 3000);
    } catch (err) {
      setPwdErr(err instanceof ApiError ? err.message : "Error al cambiar contrasena");
    } finally {
      setPwdSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all";
  const readonlyCls = "w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed";

  return (
    <div className="space-y-5">

      {/* Informacion del comercio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Informacion del comercio</h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Editable */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nombre del comercio</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Read-only */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <span>RUC</span>
                <span className="material-symbols-outlined text-xs text-gray-300">lock</span>
              </label>
              <input readOnly value={profile?.ruc ?? "—"} className={readonlyCls} />
              <p className="text-xs text-gray-300 mt-1">El RUC no puede modificarse</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <span>Estado</span>
                <span className="material-symbols-outlined text-xs text-gray-300">lock</span>
              </label>
              <div className={`${readonlyCls} flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: profile?.status === "active" ? "#10b981" : "#ef4444" }} />
                <span>{profile?.status === "active" ? "Activo" : profile?.status ?? "—"}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <span>Miembro desde</span>
                <span className="material-symbols-outlined text-xs text-gray-300">lock</span>
              </label>
              <input
                readOnly
                value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                className={readonlyCls}
              />
            </div>
          </div>

          {saveErr && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{saveErr}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: saveOk ? "#10b981" : "#F89937" }}
            >
              <span className="material-symbols-outlined text-base">
                {saveOk ? "check_circle" : "save"}
              </span>
              {saving ? "Guardando..." : saveOk ? "Guardado" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seguridad</h2>
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: "#003358" }}
          >
            <span className="material-symbols-outlined text-base">{showPwd ? "expand_less" : "lock_reset"}</span>
            {showPwd ? "Cancelar" : "Cambiar contrasena"}
          </button>
        </div>

        {/* Info de seguridad cuando no esta expandido */}
        {!showPwd && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#10b98115" }}>
              <span className="material-symbols-outlined text-xl" style={{ color: "#10b981" }}>verified_user</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Contrasena configurada</p>
              <p className="text-xs text-gray-400">Tu cuenta esta protegida con contrasena</p>
            </div>
          </div>
        )}

        {/* Formulario cambio de contrasena */}
        {showPwd && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contrasena actual</label>
              <input
                type="password"
                required
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                placeholder="Ingresa tu contrasena actual"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nueva contrasena</label>
                <input
                  type="password"
                  required
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  placeholder="Min. 8 caracteres"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirmar contrasena</label>
                <input
                  type="password"
                  required
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                  placeholder="Repite la nueva contrasena"
                  className={inputCls}
                />
              </div>
            </div>

            {pwdErr && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{pwdErr}</p>}
            {pwdOk  && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">Contrasena cambiada correctamente</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwdSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "#003358" }}
              >
                <span className="material-symbols-outlined text-base">lock_reset</span>
                {pwdSaving ? "Cambiando..." : "Cambiar contrasena"}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
