"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step1 {
  autorizoDatos: boolean;
  nombres: string; apellidos: string; tipoDoc: string;
  numDoc: string; celular: string; correo: string; cargo: string;
  esRepresentante: boolean;
  repNombres: string; repApellidos: string; repTipoDoc: string;
  repNumDoc: string; repCelular: string; repCorreo: string;
}

interface Step2 {
  nombreComercial: string; colores: string[];
  logo: File | null; logoPreview: string;
  tipoPersona: string; ruc: string; razonSocial: string;
  descripcion: string; actividad: string;
  sitioWeb: string; correoComercio: string; telefono: string;
}

interface Step3 {
  ciudad: string; direccion: string;
  nombreBeneficiario: string; apellidoBeneficiario: string;
  entidadFinanciera: string; tipoCuenta: string; numeroCuenta: string;
  bancoAfiliacion: string;
}

interface Step4 {
  cedulaFrente: File | null; cedulaDorso: File | null;
  rucDoc: File | null; camaraComercio: File | null; estadoCuenta: File | null;
  password: string; confirmPassword: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_DOC = ["Cédula de ciudadanía", "Pasaporte", "Cédula de extranjería", "NIT"];
const TIPOS_PERSONA = ["Persona natural", "Persona jurídica"];
const PROVINCIAS = ["Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas","Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago","Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo","Sucumbíos","Tungurahua","Zamora Chinchipe"];
const BANCOS_EC = ["Banco del Pichincha","Banco del Guayaquil","Produbanco","Banco Internacional","Banco Bolivariano","Banco del Austro","Banco del Pacífico","Diners Club","Cooperativa JEP"];
const TIPOS_CUENTA = ["Cuenta de ahorros","Cuenta corriente"];
const COLORES_PRESET = ["#003358","#F89937","#0066FF","#10b981","#ef4444","#8b5cf6","#000000"];

const BANCOS_AFILIACION = [
  { id: "internacional", nombre: "BANCO\nINTERNACIONAL", color: "#F89937" },
  { id: "bolivariano",   nombre: "BANCO\nBOLIVARIANO",   color: "#0d8c8c" },
  { id: "produbanco",    nombre: "BANCO\nPRODUBANCO",     color: "#1a4d3a" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InputLine({ label, value, onChange, placeholder, type = "text", required = true }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <input
        type={type} required={required} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-b border-gray-300 focus:border-[#003358] bg-transparent py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition-colors"
      />
    </div>
  );
}

function SelectLine({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="border-b border-gray-300 focus:border-[#003358] bg-transparent py-2 text-sm text-gray-800 outline-none appearance-none cursor-pointer transition-colors"
      >
        <option value="" disabled>{placeholder ?? "Seleccione una opción"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-1">
      <span className="material-symbols-outlined text-[#003358] text-xl">{icon}</span>
      <h2 className="text-lg font-bold text-[#003358]">{title}</h2>
    </div>
  );
}

function FileUpload({ label, sublabel, file, onChange, accept = ".pdf,.jpg,.jpeg,.png", required }: {
  label: string; sublabel?: string; file: File | null;
  onChange: (f: File | null) => void; accept?: string; required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      {sublabel && <p className="text-xs text-gray-400 mb-1">{sublabel}</p>}
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#F89937] transition-colors flex items-center gap-3 group"
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-orange-50 flex items-center justify-center shrink-0 transition-colors">
          <span className="material-symbols-outlined text-gray-400 group-hover:text-[#F89937] text-xl transition-colors">
            {file ? "check_circle" : "upload_file"}
          </span>
        </div>
        <div className="min-w-0">
          {file
            ? <p className="text-sm text-green-600 font-medium truncate">{file.name}</p>
            : <p className="text-sm text-gray-400">Haz clic para subir o arrastra el archivo</p>
          }
          <p className="text-xs text-gray-300">{accept.replaceAll(",", " · ").replaceAll(".", "").toUpperCase()}</p>
        </div>
        {file && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }}
            className="ml-auto shrink-0 text-gray-300 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

// ─── Botones de navegación ────────────────────────────────────────────────────

function NavButtons({ step, total, onPrev, loading }: {
  step: number; total: number; onPrev: () => void; loading?: boolean;
}) {
  const isLast = step === total;
  return (
    <div className="flex justify-between mt-10 gap-4">
      {step > 1 ? (
        <button type="button" onClick={onPrev}
          className="flex items-center gap-2 px-8 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span> Paso anterior
        </button>
      ) : <div />}
      <button type="submit" disabled={loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
        style={{ background: "#003358" }}>
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <>{isLast ? "Enviar solicitud" : "Siguiente paso"}
          <span className="material-symbols-outlined text-lg">{isLast ? "send" : "arrow_forward"}</span></>
        )}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ pk: string; sk: string } | null>(null);

  const [s1, setS1] = useState<Step1>({
    autorizoDatos: false,
    nombres: "", apellidos: "", tipoDoc: "", numDoc: "", celular: "", correo: "", cargo: "",
    esRepresentante: false,
    repNombres: "", repApellidos: "", repTipoDoc: "", repNumDoc: "", repCelular: "", repCorreo: "",
  });

  const [s2, setS2] = useState<Step2>({
    nombreComercial: "", colores: ["#003358", "#F89937"],
    logo: null, logoPreview: "",
    tipoPersona: "", ruc: "", razonSocial: "",
    descripcion: "", actividad: "",
    sitioWeb: "", correoComercio: "", telefono: "",
  });

  const [s3, setS3] = useState<Step3>({
    ciudad: "", direccion: "",
    nombreBeneficiario: "", apellidoBeneficiario: "",
    entidadFinanciera: "", tipoCuenta: "", numeroCuenta: "",
    bancoAfiliacion: "",
  });

  const [s4, setS4] = useState<Step4>({
    cedulaFrente: null, cedulaDorso: null,
    rucDoc: null, camaraComercio: null, estadoCuenta: null,
    password: "", confirmPassword: "",
  });

  // Auto-fill representante when checkbox is ticked
  useEffect(() => {
    if (s1.esRepresentante) {
      setS1(p => ({
        ...p,
        repNombres: p.nombres, repApellidos: p.apellidos,
        repTipoDoc: p.tipoDoc, repNumDoc: p.numDoc,
        repCelular: p.celular, repCorreo: p.correo,
      }));
    }
  }, [s1.esRepresentante]);

  function handleLogoChange(file: File | null) {
    if (!file) { setS2(p => ({ ...p, logo: null, logoPreview: "" })); return; }
    const reader = new FileReader();
    reader.onload = e => setS2(p => ({ ...p, logo: file, logoPreview: e.target?.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleFinalSubmit() {
    if (s4.password !== s4.confirmPassword) {
      setError("Las contraseñas no coinciden"); return;
    }
    setError(null); setLoading(true);
    try {
      const res = await api.post<{ pk_test: string; sk_test: string }>("/v1/auth/register", {
        business_name: s2.nombreComercial || s2.razonSocial,
        ruc: s2.ruc,
        email: s1.correo,
        password: s4.password,
      });
      setApiKeys({ pk: res.pk_test ?? "", sk: res.sk_test ?? "" });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function handleStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step < 4) setStep(s => s + 1);
    else handleFinalSubmit();
  }

  // ── Success ──
  if (done && apiKeys) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#003358]">¡Solicitud enviada!</h2>
            <p className="text-gray-500 text-sm mt-2">Tu cuenta está en revisión. Guarda estas claves — la secreta <strong>no se puede recuperar</strong>.</p>
          </div>
          <div className="space-y-3 text-left">
            <KeyBlock label="Clave pública (pk_test)" value={apiKeys.pk} />
            <KeyBlock label="Clave secreta (sk_test) — copia ahora" value={apiKeys.sk} secret />
          </div>
          <button onClick={() => router.push("/dashboard")}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm"
            style={{ background: "#003358" }}>
            Ir al dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard layout ──
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 md:px-16 py-6 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-400">Paso {step} de 4</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/landing.html"><img src="/logo.png" alt="MedianetPay" className="h-8 hover:opacity-80 transition-opacity" /></a>
      </header>

      <form onSubmit={handleStep}>
        <div className="px-8 md:px-16 py-8 max-w-5xl mx-auto">

          {/* ══ STEP 1 ══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-[#003358]">Diligenciante y representante legal</h1>
              <p className="text-sm mt-1" style={{ color: "#F89937" }}>Datos personales del diligenciante y el representante legal.</p>

              <SectionHeader icon="person" title="Información diligenciante" />
              <p className="text-sm text-gray-500 mb-4">Información personal de quien esta realizando el registro.</p>

              {/* Checkbox autorización */}
              <label className="flex items-start gap-2 mb-6 cursor-pointer">
                <input type="checkbox" required checked={s1.autorizoDatos}
                  onChange={e => setS1(p => ({ ...p, autorizoDatos: e.target.checked }))}
                  className="mt-0.5 accent-[#003358]" />
                <span className="text-sm text-gray-600">
                  Autorizo de manera libre, voluntaria, explícita, e inequívoca a Medianet S.A. a realizar{" "}
                  <span className="text-[#0066FF] underline cursor-pointer">el tratamiento de mis datos personales.</span>
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputLine label="Nombres" value={s1.nombres} onChange={v => setS1(p=>({...p,nombres:v}))} placeholder="Digite su nombre" />
                <InputLine label="Apellidos" value={s1.apellidos} onChange={v => setS1(p=>({...p,apellidos:v}))} placeholder="Digite sus apellidos" />
                <SelectLine label="Tipo de documento" value={s1.tipoDoc} onChange={v => setS1(p=>({...p,tipoDoc:v}))} options={TIPOS_DOC} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <InputLine label="Número de documento" value={s1.numDoc} onChange={v => setS1(p=>({...p,numDoc:v}))} placeholder="Digite su número de documento" />
                <InputLine label="Celular de contacto" value={s1.celular} onChange={v => setS1(p=>({...p,celular:v}))} placeholder="Digite su número de celular" type="tel" />
                <InputLine label="Correo electrónico" value={s1.correo} onChange={v => setS1(p=>({...p,correo:v}))} placeholder="Digite su correo electrónico" type="email" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <InputLine label="Cargo que ocupa" value={s1.cargo} onChange={v => setS1(p=>({...p,cargo:v}))} placeholder="Digite su cargo que ocupa dentro del comercio" />
              </div>

              <SectionHeader icon="group" title="Representante legal" />
              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input type="checkbox" checked={s1.esRepresentante}
                  onChange={e => setS1(p => ({ ...p, esRepresentante: e.target.checked }))}
                  className="accent-[#003358]" />
                <span className="text-sm text-gray-600">Marca esta casilla si eres el representante legal</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputLine label="Nombres" value={s1.repNombres} onChange={v => setS1(p=>({...p,repNombres:v}))} placeholder="Digite el nombre del representante legal" />
                <InputLine label="Apellidos" value={s1.repApellidos} onChange={v => setS1(p=>({...p,repApellidos:v}))} placeholder="Digite los apellidos del representante legal" />
                <SelectLine label="Tipo de documento" value={s1.repTipoDoc} onChange={v => setS1(p=>({...p,repTipoDoc:v}))} options={TIPOS_DOC} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <InputLine label="Número de documento" value={s1.repNumDoc} onChange={v => setS1(p=>({...p,repNumDoc:v}))} placeholder="Digite el número de documento del representante legal" />
                <InputLine label="Celular de contacto" value={s1.repCelular} onChange={v => setS1(p=>({...p,repCelular:v}))} placeholder="Digite el número de celular del representante legal" type="tel" />
                <InputLine label="Correo electrónico" value={s1.repCorreo} onChange={v => setS1(p=>({...p,repCorreo:v}))} placeholder="Digite el correo electrónico del representante legal" type="email" />
              </div>
            </>
          )}

          {/* ══ STEP 2 ══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-[#003358]">Información general del comercio</h1>
              <p className="text-sm mt-1 text-gray-500">Datos generales del comercio.</p>
              <p className="text-sm text-gray-500 mt-3">Información que identifica la marca del comercio.</p>

              {/* Nombre + colores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    Nombre comercial <span className="material-symbols-outlined text-[#F89937] text-base">info</span>
                  </label>
                  <input value={s2.nombreComercial} onChange={e => setS2(p=>({...p,nombreComercial:e.target.value}))}
                    placeholder="Digite el nombre de su comercio" required
                    className="border-b border-gray-300 focus:border-[#003358] bg-transparent py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    Colores del comercio <span className="material-symbols-outlined text-[#F89937] text-base">info</span>
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {COLORES_PRESET.map(c => (
                      <button key={c} type="button" onClick={() => {
                        setS2(p => ({
                          ...p,
                          colores: p.colores.includes(c)
                            ? p.colores.filter(x => x !== c)
                            : p.colores.length < 2 ? [...p.colores, c] : [p.colores[1], c]
                        }));
                      }}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background: c,
                          outline: s2.colores.includes(c) ? `3px solid ${c}` : "none",
                          outlineOffset: "2px",
                          boxShadow: s2.colores.includes(c) ? "0 0 0 1px white inset" : "none",
                        }} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Seleccionados: {s2.colores.join(", ")}</p>
                </div>
              </div>

              {/* Logo upload */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-700">Logo del comercio (opcional)</p>
                <p className="text-xs text-gray-400 mb-3">Restricciones de imagen [ Dimensiones iguales · Max. 2Mb · *.png, *.jpg, *.jpeg ]</p>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => document.getElementById("logo-input")?.click()}
                    className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#F89937] cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
                  >
                    {s2.logoPreview
                      ? <img src={s2.logoPreview} alt="logo" className="w-full h-full object-cover" />
                      : <span className="material-symbols-outlined text-gray-300 text-3xl">image</span>
                    }
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#F89937] rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-sm">add</span>
                    </div>
                  </div>
                  {s2.logo && (
                    <button type="button" onClick={() => handleLogoChange(null)}
                      className="text-xs text-red-400 hover:text-red-600">Quitar logo</button>
                  )}
                  <input id="logo-input" type="file" accept=".png,.jpg,.jpeg" className="hidden"
                    onChange={e => handleLogoChange(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              <SectionHeader icon="storefront" title="Información del comercio" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <SelectLine label="Tipo de persona" value={s2.tipoPersona} onChange={v => setS2(p=>({...p,tipoPersona:v}))} options={TIPOS_PERSONA} />
                <InputLine label="RUC" value={s2.ruc} onChange={v => setS2(p=>({...p,ruc:v}))} placeholder="Digite el RUC" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    Razón social <span className="material-symbols-outlined text-[#F89937] text-base">info</span>
                  </label>
                  <input value={s2.razonSocial} onChange={e => setS2(p=>({...p,razonSocial:e.target.value}))}
                    placeholder="Digite la razón social del comercio" required
                    className="border-b border-gray-300 focus:border-[#003358] bg-transparent py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <InputLine label="Describe tú negocio" value={s2.descripcion} onChange={v => setS2(p=>({...p,descripcion:v}))} placeholder="Describa su negocio" />
                <InputLine label="Actividad económica" value={s2.actividad} onChange={v => setS2(p=>({...p,actividad:v}))} placeholder="Describa la actividad de su negocio" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <InputLine label="Sitio web (opcional)" value={s2.sitioWeb} onChange={v => setS2(p=>({...p,sitioWeb:v}))} placeholder="Digite la url de su sitio web" required={false} />
                <InputLine label="Correo electrónico" value={s2.correoComercio} onChange={v => setS2(p=>({...p,correoComercio:v}))} placeholder="Digite el correo electrónico del comercio" type="email" />
                <InputLine label="Teléfono" value={s2.telefono} onChange={v => setS2(p=>({...p,telefono:v}))} placeholder="Digite el teléfono del comercio" type="tel" />
              </div>
            </>
          )}

          {/* ══ STEP 3 ══════════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-[#003358]">Ubicación e información bancaria</h1>
              <p className="text-sm mt-1 text-gray-500">Datos de la ubicación e información bancaria.</p>

              <p className="text-sm font-semibold text-gray-600 mt-6 mb-4">Información correspondiente a la ubicación del comercio.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectLine label="Ciudad" value={s3.ciudad} onChange={v => setS3(p=>({...p,ciudad:v}))} options={PROVINCIAS} placeholder="Seleccione la provincia" />
                <InputLine label="Dirección" value={s3.direccion} onChange={v => setS3(p=>({...p,direccion:v}))} placeholder="Digite la dirección del comercio" />
              </div>

              <SectionHeader icon="account_balance" title="Datos bancarios" />
              <p className="text-sm text-gray-500 mb-4">Información de la cuenta bancaria a la que deseas que te consignemos los pagos por tus ventas.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputLine label="Nombre Beneficiario" value={s3.nombreBeneficiario} onChange={v => setS3(p=>({...p,nombreBeneficiario:v}))} placeholder="Digite el nombre del beneficiario" />
                <InputLine label="Apellido Beneficiario" value={s3.apellidoBeneficiario} onChange={v => setS3(p=>({...p,apellidoBeneficiario:v}))} placeholder="Digite el apellido del beneficiario" />
                <SelectLine label="Entidad financiera" value={s3.entidadFinanciera} onChange={v => setS3(p=>({...p,entidadFinanciera:v}))} options={BANCOS_EC} placeholder="Seleccione la entidad financiera" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <SelectLine label="Tipo de cuenta" value={s3.tipoCuenta} onChange={v => setS3(p=>({...p,tipoCuenta:v}))} options={TIPOS_CUENTA} placeholder="Seleccione el tipo de cuenta" />
                <InputLine label="Número de cuenta" value={s3.numeroCuenta} onChange={v => setS3(p=>({...p,numeroCuenta:v}))} placeholder="Digite el número de cuenta" />
              </div>

              {/* Banco afiliación */}
              <div className="mt-8 text-center">
                <p className="font-bold text-[#003358] flex items-center justify-center gap-1">
                  ¿A que banco deseas afiliarte? <span className="material-symbols-outlined text-[#F89937] text-base">help</span>
                </p>
                <p className="text-sm text-gray-400 mb-4">Da click sobre el banco al que deseas afiliarte...</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {BANCOS_AFILIACION.map(b => (
                    <button key={b.id} type="button"
                      onClick={() => setS3(p => ({ ...p, bancoAfiliacion: b.id }))}
                      className="w-44 h-28 rounded-2xl flex items-center justify-center gap-3 transition-all"
                      style={{
                        background: b.color,
                        opacity: s3.bancoAfiliacion && s3.bancoAfiliacion !== b.id ? 0.4 : 1,
                        transform: s3.bancoAfiliacion === b.id ? "scale(1.04)" : "scale(1)",
                        boxShadow: s3.bancoAfiliacion === b.id ? `0 8px 24px ${b.color}55` : "none",
                      }}>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-400">account_balance</span>
                      </div>
                      <span className="text-white text-xs font-bold leading-tight text-left">{b.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══ STEP 4 ══════════════════════════════════════════════════════ */}
          {step === 4 && (
            <>
              <h1 className="text-2xl font-bold text-[#003358]">Documentación y soportes</h1>
              <p className="text-sm mt-1 text-gray-500">Adjunta los documentos requeridos para completar tu registro.</p>

              <SectionHeader icon="badge" title="Documentos del diligenciante" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <FileUpload label="Cédula de identidad — Frente" sublabel="Copia legible del frente de tu cédula"
                  file={s4.cedulaFrente} onChange={f => setS4(p=>({...p,cedulaFrente:f}))} accept=".jpg,.jpeg,.png,.pdf" />
                <FileUpload label="Cédula de identidad — Dorso" sublabel="Copia legible del reverso de tu cédula"
                  file={s4.cedulaDorso} onChange={f => setS4(p=>({...p,cedulaDorso:f}))} accept=".jpg,.jpeg,.png,.pdf" />
              </div>

              <SectionHeader icon="receipt_long" title="Documentos del comercio" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <FileUpload label="RUC actualizado" sublabel="Documento RUC emitido por el SRI"
                  file={s4.rucDoc} onChange={f => setS4(p=>({...p,rucDoc:f}))} accept=".pdf,.jpg,.jpeg,.png" />
                <FileUpload label="Cámara de comercio / Acta de constitución" sublabel="Requerido para personas jurídicas"
                  file={s4.camaraComercio} onChange={f => setS4(p=>({...p,camaraComercio:f}))} accept=".pdf" required={false} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <FileUpload label="Estado de cuenta bancaria" sublabel="Últimos 3 meses de la cuenta registrada"
                  file={s4.estadoCuenta} onChange={f => setS4(p=>({...p,estadoCuenta:f}))} accept=".pdf,.jpg,.jpeg,.png" />
              </div>

              <SectionHeader icon="lock" title="Crea tu contraseña" />
              <p className="text-sm text-gray-500 mb-4">Esta será la contraseña para acceder a tu portal MediaNetPay.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputLine label="Contraseña (mín. 8 caracteres)" value={s4.password}
                  onChange={v => setS4(p=>({...p,password:v}))} type="password" placeholder="••••••••" />
                <InputLine label="Confirmar contraseña" value={s4.confirmPassword}
                  onChange={v => setS4(p=>({...p,confirmPassword:v}))} type="password" placeholder="••••••••" />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-100">{error}</p>
          )}

          <NavButtons step={step} total={4} onPrev={() => setStep(s => s - 1)} loading={loading} />

          {/* ── Botón de prueba ── */}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => {
                if (step < 4) { setStep(s => s + 1); }
                else { setApiKeys({ pk: "pk_test_demo1234567890", sk: "sk_test_demo0987654321" }); setDone(true); }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-[#F89937] hover:text-[#F89937] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">skip_next</span>
              Saltar paso (modo prueba)
            </button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className="font-bold hover:underline underline-offset-4" style={{ color: "#F89937" }}>
              Iniciar Sesión
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── KeyBlock (reutilizado del flujo anterior) ────────────────────────────────

function KeyBlock({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <div className={`rounded-lg p-3 ${secret ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-200"}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-gray-800 break-all flex-1">{value}</code>
        <button onClick={copy} className="text-xs text-blue-600 hover:text-blue-800 shrink-0">{copied ? "✓" : "Copiar"}</button>
      </div>
    </div>
  );
}
