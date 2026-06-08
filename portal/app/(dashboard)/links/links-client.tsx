"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { PaymentLink } from "@/lib/types";

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtUSD(v: string | null) {
  if (!v) return "Monto libre";
  return "$" + parseFloat(v).toFixed(2);
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpiringSoon(iso: string | null) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 3; // < 3 days
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: "Activo",   bg: "#d1fae5", text: "#065f46" },
  inactive: { label: "Inactivo", bg: "#f3f4f6", text: "#6b7280" },
  expired:  { label: "Vencido",  bg: "#fee2e2", text: "#991b1b" },
};

// ─── Main component ────────────────────────────────────────────────────────

export function LinksClient({ links: initialLinks }: { links: PaymentLink[] }) {
  const router = useRouter();
  const [links, setLinks] = useState<PaymentLink[]>(initialLinks);
  const [showCreate, setShowCreate] = useState(false);
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function copy(url: string, id: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function deactivate(link: PaymentLink) {
    if (!confirm(`Desactivar el link "${link.description}"? Esta accion es irreversible.`)) return;
    setDeactivating(link.id);
    try {
      const updated = await api.patch<PaymentLink>(`/v1/links/${link.id}/deactivate`, {});
      setLinks((prev) => prev.map((l) => (l.id === link.id ? updated : l)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al desactivar");
    } finally {
      setDeactivating(null);
    }
  }

  async function deleteLink(link: PaymentLink) {
    if (!confirm(`Eliminar el link "${link.description}"? Esta accion es permanente.`)) return;
    setDeleting(link.id);
    try {
      await api.delete(`/v1/links/${link.id}`);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      startTransition(() => router.refresh());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Error al eliminar";
      alert(msg);
    } finally {
      setDeleting(null);
    }
  }

  function onCreated(link: PaymentLink) {
    setLinks((prev) => [link, ...prev]);
    setShowCreate(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-700">
            {links.length} link{links.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: "#F89937" }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo link
          </button>
        </div>

        {/* Empty state */}
        {links.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#F8993718" }}>
              <span className="material-symbols-outlined text-3xl" style={{ color: "#F89937" }}>link</span>
            </div>
            <p className="text-sm font-semibold text-gray-500">Aun no tienes links</p>
            <p className="text-xs text-gray-400">Crea tu primer link de cobro para compartir con tus clientes</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#F89937" }}
            >
              Crear primer link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {links.map((link) => {
              const cfg = STATUS_CFG[link.status] ?? STATUS_CFG.inactive;
              const pct = link.max_uses ? Math.min(100, Math.round((link.uses_count / link.max_uses) * 100)) : null;
              const expiring = isExpiringSoon(link.expires_at);
              const expired = link.status === "expired";

              return (
                <div key={link.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 truncate">{link.description}</p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="font-medium text-gray-600">{fmtUSD(link.amount)}</span>
                      {link.expires_at && (
                        <span className={expiring ? "text-orange-500 font-semibold" : expired ? "text-red-500" : ""}>
                          Vence {fmtDate(link.expires_at)}
                          {expiring && " — pronto"}
                        </span>
                      )}
                    </div>

                    {/* Usage bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        {pct !== null ? (
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 90 ? "#ef4444" : pct >= 60 ? "#F89937" : "#10b981",
                            }}
                          />
                        ) : (
                          <div className="h-1.5 rounded-full bg-[#003358] opacity-20" style={{ width: "100%" }} />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {link.uses_count} / {link.max_uses ?? "sin limite"}
                      </span>
                    </div>

                    {/* URL row */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded flex-1 truncate">
                        {link.checkout_url}
                      </code>
                      <button
                        onClick={() => copy(link.checkout_url, link.id)}
                        className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Copiar URL"
                      >
                        <span className="material-symbols-outlined text-sm" style={{ color: copiedId === link.id ? "#10b981" : "#9ca3af" }}>
                          {copiedId === link.id ? "check_circle" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* QR button */}
                    <button
                      onClick={() => setQrLink(link)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
                      title="Ver QR"
                    >
                      <span className="material-symbols-outlined text-sm">qr_code</span>
                      QR
                    </button>

                    {/* Deactivate — solo si activo */}
                    {link.status === "active" && (
                      <button
                        onClick={() => deactivate(link)}
                        disabled={deactivating === link.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-400 hover:border-red-200 hover:text-red-500 transition-all disabled:opacity-50"
                        title="Desactivar link"
                      >
                        {deactivating === link.id ? (
                          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <span className="material-symbols-outlined text-sm">block</span>
                        )}
                        Desactivar
                      </button>
                    )}

                    {/* Delete — backend decide si tiene pagos completados */}
                    <button
                      onClick={() => deleteLink(link)}
                      disabled={deleting === link.id}
                      className="p-2 rounded-xl border border-gray-200 text-gray-300 hover:border-red-200 hover:text-red-400 transition-all disabled:opacity-50"
                      title="Eliminar link"
                    >
                      {deleting === link.id ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-sm">delete</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal crear link */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={onCreated} />
      )}

      {/* Modal QR */}
      {qrLink && (
        <QrModal link={qrLink} onClose={() => setQrLink(null)} />
      )}
    </>
  );
}

// ─── Create modal ──────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (l: PaymentLink) => void }) {
  const [form, setForm] = useState({ description: "", amount: "", max_uses: "", expires_at: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { description: form.description };
      if (form.amount)   body.amount   = parseFloat(form.amount);
      if (form.max_uses) body.max_uses = parseInt(form.max_uses, 10);
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      const link = await api.post<PaymentLink>("/v1/links", body);
      onCreated(link);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear el link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#F8993720" }}>
              <span className="material-symbols-outlined text-lg" style={{ color: "#F89937" }}>add_link</span>
            </div>
            <h2 className="text-base font-bold text-[#003358]">Nuevo link de cobro</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripcion *</label>
            <input
              required
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Pago por consultoria"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Monto USD <span className="text-gray-400 font-normal">(dejar vacio = cliente ingresa el monto)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max. usos</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Sin limite"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vencimiento</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "#F89937" }}
            >
              {loading ? "Creando..." : "Crear link + QR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── QR modal ─────────────────────────────────────────────────────────────

function QrModal({ link, onClose }: { link: PaymentLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(link.checkout_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#003358] truncate pr-4">{link.description}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 shrink-0">
            <span className="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-4">
          {link.qr_png_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={link.qr_png_url}
              alt="QR de cobro"
              width={200}
              height={200}
              className="rounded-xl border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-48 h-48 rounded-xl bg-gray-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-gray-300">qr_code</span>
            </div>
          )}

          <p className="text-xs text-gray-400 font-medium">
            {link.amount ? `$${parseFloat(link.amount).toFixed(2)}` : "Monto libre"} ·{" "}
            {link.uses_count} uso{link.uses_count !== 1 ? "s" : ""}
          </p>

          <div className="w-full flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <code className="text-xs text-gray-500 flex-1 truncate">{link.checkout_url}</code>
            <button onClick={copyUrl} className="shrink-0">
              <span className="material-symbols-outlined text-sm" style={{ color: copied ? "#10b981" : "#9ca3af" }}>
                {copied ? "check_circle" : "content_copy"}
              </span>
            </button>
          </div>

          <div className="flex gap-3 w-full">
            {link.qr_png_url && (
              <a
                href={link.qr_png_url}
                download={`qr-${link.token ?? link.id}.png`}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Descargar QR
              </a>
            )}
            <button
              onClick={copyUrl}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: "#003358" }}
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              {copied ? "Copiado!" : "Copiar URL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
