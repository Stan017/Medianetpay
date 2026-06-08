"use client";

import { useState } from "react";

export function ReceiptButtons({ transactionId, txRef }: { transactionId: string; txRef: string }) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function fetchPdf(): Promise<Blob> {
    const res = await fetch(`/api/receipt/${transactionId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Surface the real backend detail for debugging
      const detail = typeof data.detail === "object" && data.detail?.message
        ? data.detail.message
        : typeof data.detail === "string" ? data.detail : "";
      const msg = res.status === 401
        ? "Sesión expirada. Vuelve a iniciar sesión."
        : res.status === 404
        ? "Transacción no encontrada."
        : detail || data.error || `Error ${res.status}`;
      throw new Error(msg);
    }
    return res.blob();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo-${txRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al descargar el recibo");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const blob = await fetchPdf();
      const file = new File([blob], `recibo-${txRef}.pdf`, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        // Compartir archivo nativo (mobile)
        await navigator.share({
          title: `Recibo de pago ${txRef}`,
          text: "Adjunto el recibo de tu pago procesado por MediaNetPay.",
          files: [file],
        });
      } else {
        // Fallback: descargar directamente
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recibo-${txRef}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        alert("No se pudo compartir el recibo");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex gap-2">
      {/* Descargar */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
      >
        {downloading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <span className="material-symbols-outlined text-base">download</span>
        )}
        Descargar Recibo
      </button>

      {/* Compartir */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white active:scale-95 transition-all disabled:opacity-60"
        style={{ background: "#003358" }}
      >
        {sharing ? (
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <span className="material-symbols-outlined text-base">share</span>
        )}
        Compartir
      </button>
    </div>
  );
}
