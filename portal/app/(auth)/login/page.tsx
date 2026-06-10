"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Server Action: hace el fetch, setea la cookie y redirige — todo en el servidor
      const result = await loginAction(form.email, form.password);
      if (result?.error) setError(result.error);
    } catch {
      // loginAction lanza NEXT_REDIRECT al redirigir — no es un error real
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 overflow-x-hidden relative"
      style={{
        backgroundColor: "#faf8ff",
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(0,102,255,0.05) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(0,51,88,0.05) 0px, transparent 50%),
          radial-gradient(at 50% 0%, rgba(0,194,255,0.03) 0px, transparent 50%)
        `,
      }}
    >
      <main className="w-full max-w-md">
        {/* Logo encima del card — flujo normal, sin fixed */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/landing.html"><img src="/logo.png" alt="MedianetPay" className="h-10 hover:opacity-80 transition-opacity" /></a>
        </div>
        {/* Glass card */}
        <div
          className="rounded-[2rem] p-8 md:p-10 flex flex-col items-center"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 32px 0 rgba(0,51,88,0.08)",
          }}
        >
          {/* Título */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ color: "#003358" }}
            >
              Bienvenido
            </h1>
            <p className="text-slate-500 text-sm">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Formulario */}
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-500 ml-1"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 transition-all duration-200"
                  placeholder="nombre@empresa.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-500"
                >
                  Contraseña
                </label>
                <a
                  href="mailto:soporte@medianetpay.ec?subject=Recuperar%20contrase%C3%B1a"
                  className="text-sm font-medium text-blue-600 hover:underline underline-offset-4"
                  title="Enviar email a soporte@medianetpay.ec"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white font-semibold text-base rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
              style={{
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                color: "#F89937",
                border: "1.5px solid rgba(248,153,55,0.25)",
              }}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  style={{color:"#F89937"}}
                  xmlns="http://www.w3.org/2000/svg"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <span className="material-symbols-outlined text-[20px]">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center gap-4 my-7">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">
              O continúa con
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              disabled
              title="Próximamente"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl opacity-50 cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-medium text-slate-400">Google</span>
            </button>
            <button
              disabled
              title="Próximamente"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl opacity-50 cursor-not-allowed"
            >
              <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="text-sm font-medium text-slate-400">Apple</span>
            </button>
          </div>

          {/* Footer link */}
          <p className="mt-9 text-slate-500 text-sm">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-bold hover:underline underline-offset-4 ml-1"
              style={{ color: "#F89937" }}
            >
              Crear Cuenta
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="material-symbols-outlined text-[18px]">
              verified_user
            </span>
            <span className="text-xs uppercase tracking-tighter font-medium">
              Secure 256-bit SSL
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="material-symbols-outlined text-[18px]">
              gpp_good
            </span>
            <span className="text-xs uppercase tracking-tighter font-medium">
              PCI DSS Compliant
            </span>
          </div>
        </div>
      </main>

      {/* Background blobs */}
      <div
        className="fixed top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full -z-10 animate-pulse"
        style={{ background: "rgba(0,102,255,0.05)", filter: "blur(120px)" }}
      />
      <div
        className="fixed bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] rounded-full -z-10"
        style={{ background: "rgba(0,194,255,0.05)", filter: "blur(100px)" }}
      />
    </div>
  );
}
