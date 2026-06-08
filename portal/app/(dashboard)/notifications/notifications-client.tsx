"use client";

import { useState, useEffect } from "react";
import { getReadIds, saveReadState } from "@/lib/notif-store";

interface Notification {
  id: string;
  icon: string;
  color: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tag: "pago" | "alerta" | "sistema" | "liquidacion";
}

const TAG_LABELS: Record<string, string> = {
  pago: "Pago", alerta: "Alerta", sistema: "Sistema", liquidacion: "Liquidación",
};

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  pago:        { bg: "#f0fdf4", text: "#16a34a" },
  alerta:      { bg: "#fef2f2", text: "#dc2626" },
  sistema:     { bg: "#eff6ff", text: "#2563eb" },
  liquidacion: { bg: "#f5f3ff", text: "#7c3aed" },
};

export function NotificationsClient({ initial }: { initial: Notification[] }) {
  // Inicializar con estado persistido en localStorage
  const [notifs, setNotifs] = useState<Notification[]>(() => {
    const readIds = getReadIds();
    return initial.map(n => ({ ...n, read: readIds.includes(n.id) ? true : n.read }));
  });

  // Sincronizar localStorage al montar (por si cambió en otra pestaña)
  useEffect(() => {
    const readIds = getReadIds();
    setNotifs(prev => prev.map(n => ({ ...n, read: readIds.includes(n.id) ? true : n.read })));
  }, []);

  function persist(updated: Notification[]) {
    const readIds = updated.filter(n => n.read).map(n => n.id);
    const unread  = updated.filter(n => !n.read).length;
    saveReadState(readIds, unread);
    setNotifs(updated);
  }

  const unread = notifs.filter(n => !n.read).length;

  function markAllRead() {
    persist(notifs.map(n => ({ ...n, read: true })));
  }

  function markOne(id: string) {
    persist(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003358]">Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unread > 0 ? `${unread} sin leer` : "Todo al día"} · {notifs.length} en total
          </p>
        </div>

        {unread > 0 ? (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: "#F8993720", color: "#F89937" }}
          >
            <span className="material-symbols-outlined text-base">mark_email_read</span>
            {unread} sin leer
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl bg-green-50 text-green-600">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Todo leído
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {notifs.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-200">notifications_off</span>
            <p className="text-gray-400 text-sm mt-3">No tienes notificaciones</p>
          </div>
        ) : (
          notifs.map(n => {
            const tagStyle = TAG_COLORS[n.tag] ?? TAG_COLORS.sistema;
            return (
              <div
                key={n.id}
                onClick={() => markOne(n.id)}
                className={`flex items-start gap-4 px-6 py-5 transition-all cursor-pointer hover:bg-gray-50 ${!n.read ? "bg-orange-50/40" : ""}`}
              >
                {/* Ícono con punto sin leer */}
                <div className="relative shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{ background: n.color + "18" }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: n.color }}>{n.icon}</span>
                  </div>
                  {!n.read && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white animate-pulse"
                      style={{ background: "#F89937" }} />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold transition-colors ${n.read ? "text-gray-500" : "text-[#003358]"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: tagStyle.bg, color: tagStyle.text }}>
                      {TAG_LABELS[n.tag]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                </div>

                {/* Tiempo + check si leído */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-gray-300">{n.time}</span>
                  {n.read && (
                    <span className="material-symbols-outlined text-sm text-gray-300">done_all</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
