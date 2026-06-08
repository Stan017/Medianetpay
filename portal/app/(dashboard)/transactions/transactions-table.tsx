"use client";

import { useRouter } from "next/navigation";
import { formatUSD, formatDate, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

function initials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

const METHOD_ICONS: Record<string, string> = {
  visa: "💳", mastercard: "💳", amex: "💳", cash: "💵", transfer: "🏦",
};

export function TransactionsTable({ rows }: { rows: Transaction[] }) {
  const router = useRouter();

  return (
    <tbody className="divide-y divide-gray-50">
      {rows.map(t => {
        const ini = initials(t.customer_name, t.customer_email);
        const method = t.payment_method?.toLowerCase() ?? "";
        return (
          <tr
            key={t.id}
            onClick={() => router.push(`/transactions/${t.id}`)}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {/* Cliente */}
            <td className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "#003358" }}>
                  {ini}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {t.customer_name ?? t.customer_email ?? "—"}
                  </p>
                  {t.customer_name && t.customer_email && (
                    <p className="text-xs text-gray-400 truncate">{t.customer_email}</p>
                  )}
                </div>
              </div>
            </td>
            {/* Método */}
            <td className="px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span>{METHOD_ICONS[method] ?? "💳"}</span>
                <span className="capitalize">{t.payment_method ?? "—"}</span>
                {t.installments > 1 && (
                  <span className="text-xs text-gray-400">{t.installments}x</span>
                )}
              </span>
            </td>
            {/* Estado */}
            <td className="px-5 py-3.5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status] ?? ""}`}>
                {STATUS_LABELS[t.status] ?? t.status}
              </span>
            </td>
            {/* Monto */}
            <td className="px-5 py-3.5 text-right font-bold text-gray-900">
              {formatUSD(parseFloat(t.amount))}
            </td>
            {/* Fecha */}
            <td className="px-5 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
              {formatDate(t.created_at)}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
