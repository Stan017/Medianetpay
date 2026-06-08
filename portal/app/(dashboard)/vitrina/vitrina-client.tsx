"use client";

import { useState, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import type { CatalogService, VitrinaData } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Helper multipart ──────────────────────────────────────────────────────
// El lib/api solo maneja JSON. Para multipart usamos fetch directo con
// credentials: "include" (cookie httpOnly). NO setear Content-Type — fetch lo
// añade automáticamente con el boundary correcto. Si lo seteamos manualmente
// el backend responde 400 "Missing boundary".
async function multipartRequest<T>(
  path: string,
  method: "POST" | "PUT",
  form: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    body: form,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as { detail?: { message?: string; code?: string } })?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `Error ${res.status}`;
    throw new ApiError(res.status, detail?.code ?? "unknown", msg);
  }
  return data as T;
}

// ─── Component principal ───────────────────────────────────────────────────

export function VitrinaClient({ initial }: { initial: VitrinaData }) {
  const [vitrina, setVitrina] = useState<VitrinaData>(initial);
  const [toggling, setToggling] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeServices = vitrina.services.filter((s) => s.active);

  async function toggleVitrina() {
    if (toggling) return;
    setToggling(true);
    try {
      const result = await api.post<{
        vitrina_active: boolean;
        slug: string | null;
        vitrina_url: string | null;
      }>("/v1/catalog/activate", { active: !vitrina.vitrina_active });
      setVitrina((v) => ({
        ...v,
        vitrina_active: result.vitrina_active,
        slug: result.slug,
        vitrina_url: result.vitrina_url,
      }));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al cambiar el estado de la vitrina");
    } finally {
      setToggling(false);
    }
  }

  function copyUrl() {
    if (!vitrina.vitrina_url) return;
    navigator.clipboard.writeText(vitrina.vitrina_url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  function onProfileSaved(profile: { bio: string | null; profile_image_url: string | null }) {
    setVitrina((v) => ({
      ...v,
      bio: profile.bio,
      profile_image_url: profile.profile_image_url,
    }));
  }

  function onServiceCreated(service: CatalogService) {
    setVitrina((v) => ({ ...v, services: [...v.services, service] }));
    setShowServiceModal(false);
  }

  function onServiceUpdated(service: CatalogService) {
    setVitrina((v) => ({
      ...v,
      services: v.services.map((s) => (s.id === service.id ? service : s)),
    }));
    setEditingService(null);
  }

  async function deleteService(service: CatalogService) {
    if (!confirm(`¿Eliminar el servicio "${service.name}"?`)) return;
    setDeletingId(service.id);
    try {
      await api.delete(`/v1/catalog/services/${service.id}`);
      // El backend hace soft-delete: marca active=false. Lo quitamos del UI.
      setVitrina((v) => ({
        ...v,
        services: v.services.filter((s) => s.id !== service.id),
      }));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al eliminar el servicio");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* ─── Estado + URL pública ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: vitrina.vitrina_active ? "#10b98118" : "#9ca3af18" }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ color: vitrina.vitrina_active ? "#10b981" : "#9ca3af" }}
              >
                {vitrina.vitrina_active ? "storefront" : "store"}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold text-[#003358]">
                {vitrina.vitrina_active ? "Vitrina activa" : "Vitrina inactiva"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {vitrina.vitrina_active
                  ? "Tus clientes pueden ver tu página pública"
                  : "Activa la vitrina para generar tu URL pública"}
              </p>
            </div>
          </div>

          <ToggleSwitch
            value={vitrina.vitrina_active}
            onToggle={toggleVitrina}
            disabled={toggling}
          />
        </div>

        {/* URL pública */}
        {vitrina.vitrina_url && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">URL PÚBLICA</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
              <span
                className="material-symbols-outlined text-base shrink-0"
                style={{ color: "#F89937" }}
              >
                link
              </span>
              <code className="text-sm text-gray-700 flex-1 truncate font-medium">
                {vitrina.vitrina_url}
              </code>
              <button
                onClick={copyUrl}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white transition-colors"
                title="Copiar URL"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ color: copiedUrl ? "#10b981" : "#9ca3af" }}
                >
                  {copiedUrl ? "check_circle" : "content_copy"}
                </span>
              </button>
              <a
                href={vitrina.vitrina_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-white transition-colors"
                title="Abrir vitrina"
              >
                <span className="material-symbols-outlined text-base text-gray-400">
                  open_in_new
                </span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ─── Perfil del negocio ───────────────────────────────────────────── */}
      <ProfileSection
        bio={vitrina.bio}
        profileImageUrl={vitrina.profile_image_url}
        onSaved={onProfileSaved}
      />

      {/* ─── Servicios ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Servicios ({activeServices.length} / 10)
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Cada servicio genera su propio link de pago automáticamente
            </p>
          </div>
          {activeServices.length < 10 && (
            <button
              onClick={() => setShowServiceModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: "#F89937" }}
            >
              <span className="material-symbols-outlined text-base">add</span>
              Nuevo servicio
            </button>
          )}
        </div>

        {/* Empty */}
        {activeServices.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 px-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#F8993718" }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ color: "#F89937" }}
              >
                storefront
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-500">Aún no tienes servicios</p>
            <p className="text-xs text-gray-400 text-center max-w-md">
              Agrega lo que ofreces para que tus clientes puedan pagarte directamente desde tu vitrina
            </p>
            <button
              onClick={() => setShowServiceModal(true)}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#F89937" }}
            >
              Agregar primer servicio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {activeServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={() => setEditingService(service)}
                onDelete={() => deleteService(service)}
                deleting={deletingId === service.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal crear servicio ────────────────────────────────────────── */}
      {showServiceModal && (
        <ServiceModal
          onClose={() => setShowServiceModal(false)}
          onSaved={onServiceCreated}
        />
      )}

      {/* ─── Modal editar servicio ──────────────────────────────────────── */}
      {editingService && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={onServiceUpdated}
        />
      )}
    </>
  );
}

// ─── Toggle switch animado (mismo estilo que mobile) ──────────────────────

function ToggleSwitch({
  value, onToggle, disabled,
}: {
  value: boolean; onToggle: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="relative w-14 h-7 rounded-full transition-colors disabled:opacity-50"
      style={{ background: value ? "#10b981" : "#d1d5db" }}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? "1.75rem" : "0.125rem" }}
      />
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Sección perfil del negocio ───────────────────────────────────────────

function ProfileSection({
  bio: initialBio,
  profileImageUrl,
  onSaved,
}: {
  bio: string | null;
  profileImageUrl: string | null;
  onSaved: (profile: { bio: string | null; profile_image_url: string | null }) => void;
}) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentImage = imagePreview ?? profileImageUrl;
  const hasChanges = bio !== (initialBio ?? "") || imageFile !== null;

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen no puede pesar más de 10 MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("bio", bio);
      if (imageFile) form.append("profile_image", imageFile);
      const result = await multipartRequest<{ bio: string | null; profile_image_url: string | null }>(
        "/v1/catalog/profile",
        "PUT",
        form,
      );
      onSaved(result);
      setImageFile(null);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start gap-6 flex-wrap">
        {/* Imagen */}
        <div className="shrink-0">
          <p className="text-xs font-semibold text-gray-500 mb-2">FOTO DEL NEGOCIO</p>
          <div className="relative">
            {currentImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentImage}
                alt="Perfil del negocio"
                className="w-32 h-32 rounded-2xl object-cover border border-gray-100"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
                <span className="material-symbols-outlined text-3xl text-gray-300">
                  add_a_photo
                </span>
                <span className="text-xs text-gray-400">Sin foto</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full text-white shadow-md flex items-center justify-center"
              style={{ background: "#003358" }}
              title="Cambiar foto"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickFile(file);
              }}
            />
          </div>
        </div>

        {/* Bio */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">DESCRIPCIÓN DEL NEGOCIO</p>
            <span className="text-xs text-gray-400">{bio.length} / 120</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 120))}
            placeholder="Ej: Peluquería en el norte de Quito, 10 años de experiencia..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
          />

          <button
            onClick={save}
            disabled={!hasChanges || saving}
            className="mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#003358" }}
          >
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de servicio ─────────────────────────────────────────────────────

function ServiceCard({
  service,
  onEdit,
  onDelete,
  deleting,
}: {
  service: CatalogService;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const checkoutUrl = service.payment_link_token
    ? `${API_BASE}/pay/${service.payment_link_token}`
    : null;
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!checkoutUrl) return;
    navigator.clipboard.writeText(checkoutUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4 hover:border-[#F89937]/30 hover:shadow-md transition-all">
      <div className="flex gap-4">
        {/* Imagen */}
        {service.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={service.image_url}
            alt={service.name}
            className="w-20 h-20 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-gray-300">image</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#003358] truncate">
                {service.name}
              </p>
              {service.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
            <p className="text-base font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
              ${parseFloat(service.price).toFixed(2)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            {checkoutUrl && (
              <button
                onClick={copy}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-500"
                title="Copiar link de pago"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ color: copied ? "#10b981" : "#9ca3af" }}
                >
                  {copied ? "check_circle" : "link"}
                </span>
                {copied ? "Copiado" : "Link"}
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-500"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-xs text-gray-400 disabled:opacity-50"
            >
              {deleting ? (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-sm">delete</span>
              )}
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal crear/editar servicio ──────────────────────────────────────────

function ServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service?: CatalogService;
  onClose: () => void;
  onSaved: (service: CatalogService) => void;
}) {
  const isEdit = !!service;
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service ? String(parseFloat(service.price)) : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentImage = imagePreview ?? service?.image_url ?? null;

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 10 MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Ingresa un precio mayor a $0.");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("price", String(priceNum));
      if (description.trim()) form.append("description", description.trim());
      if (imageFile) form.append("image", imageFile);

      const path = isEdit
        ? `/v1/catalog/services/${service.id}`
        : "/v1/catalog/services";
      const method = isEdit ? "PUT" : "POST";

      const result = await multipartRequest<CatalogService>(path, method, form);
      onSaved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#F8993720" }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: "#F89937" }}
              >
                {isEdit ? "edit" : "add_shopping_cart"}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#003358]">
              {isEdit ? "Editar servicio" : "Nuevo servicio"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {/* Imagen */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Imagen del servicio <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-4">
              {currentImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentImage}
                  alt="Preview"
                  className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-gray-300">
                    image
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {currentImage ? "Cambiar imagen" : "Subir imagen"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                }}
              />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nombre del servicio *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ej: Corte de cabello"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Precio USD *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                $
              </span>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
              />
            </div>
            {isEdit && service && price && !isNaN(parseFloat(price)) &&
              parseFloat(price) !== parseFloat(service.price) && (
              <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Al cambiar el precio se generará un nuevo link de pago. El anterior será archivado.
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-600">
                Descripción <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <span className="text-xs text-gray-400">{description.length} / 300</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Ej: Incluye lavado y secado"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#F89937] focus:ring-2 focus:ring-[#F89937]/20 transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Buttons */}
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
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "#F89937" }}
            >
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
