"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

export function ApiKeysSection({ pkKey }: { pkKey: string | null }) {
  const [copiedPk, setCopiedPk] = useState(false);
  const [showNote, setShowNote] = useState(false);

  function copy(value: string, setCopied: (v: boolean) => void) {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-1">API Keys</h2>
      <p className="text-sm text-gray-500 mb-4">
        Usa la clave pública en tu frontend y la clave secreta solo en tu servidor.
      </p>

      <div className="space-y-3">
        {/* Clave pública */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Clave pública (pk_test)</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">segura para frontend</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-gray-800 flex-1 break-all">
              {pkKey ?? "—"}
            </code>
            <button
              onClick={() => copy(pkKey ?? "", setCopiedPk)}
              className="text-gray-400 hover:text-gray-700 shrink-0"
              title="Copiar"
            >
              {copiedPk ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Clave secreta */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-amber-700">Clave secreta (sk_test)</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">solo en servidor</span>
          </div>
          <p className="text-xs text-amber-600">
            La clave secreta se mostró solo al registrarse y no puede recuperarse.
            Si la perdiste, contacta a soporte para regenerarla.
          </p>
          <button
            onClick={() => setShowNote(!showNote)}
            className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
          >
            {showNote ? <EyeOff size={12} /> : <Eye size={12} />}
            {showNote ? "Ocultar" : "¿Cómo regenerar?"}
          </button>
          {showNote && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-100 rounded p-2">
              Escribe a <strong>soporte@medianetpay.ec</strong> desde el email de tu cuenta
              solicitando la regeneración. Por seguridad verificamos tu identidad antes de emitir
              una nueva clave secreta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
