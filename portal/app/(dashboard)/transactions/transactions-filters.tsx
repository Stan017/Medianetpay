"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { STATUS_LABELS } from "@/lib/utils";

const STATUSES = ["", "completed", "pending", "failed", "reversed"];

export function TransactionsFilters({
  currentStatus,
  currentQ,
}: {
  currentStatus: string;
  currentQ: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const push = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // reset page on filter change
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
          search
        </span>
        <input
          type="text"
          defaultValue={currentQ}
          onChange={e => push("q", e.target.value)}
          placeholder="Buscar por email, nombre o ID…"
          className="pl-9 pr-4 py-2 w-72 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003358] transition-colors placeholder:text-gray-400"
        />
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s || "all"}
            onClick={() => push("status", s)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              currentStatus === s
                ? { background: "#003358", color: "#fff" }
                : { background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb" }
            }
          >
            {s ? (STATUS_LABELS[s] ?? s) : "Todas"}
          </button>
        ))}
      </div>
    </div>
  );
}
