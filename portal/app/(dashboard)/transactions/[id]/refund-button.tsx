"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

export function RefundButton({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(transaction.amount);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefund() {
    setError(null);
    const refundAmt = parseFloat(amount);
    const originalAmt = parseFloat(transaction.amount);
    if (isNaN(refundAmt) || refundAmt <= 0) {
      setError("El monto debe ser mayor a $0.00");
      return;
    }
    if (refundAmt > originalAmt) {
      setError(`El monto no puede superar el original ($${originalAmt.toFixed(2)})`);
      return;
    }
    setLoading(true);
    try {
      await api.post("/v1/refunds", {
        transaction_id: transaction.id,
        amount: parseFloat(amount),
        reason,
      });
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-2.5 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Reembolsar
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Monto a reembolsar (máx {formatUSD(transaction.amount)})
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={transaction.amount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Razón (opcional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Devolución por..."
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleRefund}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
