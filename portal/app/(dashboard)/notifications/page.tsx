import { createServerApi } from "@/lib/api";
import { formatUSD } from "@/lib/utils";
import type { AnalyticsSummary } from "@/lib/types";
import { NotificationsClient } from "./notifications-client";

async function getNotifications() {
  try {
    const api = await createServerApi();
    const summary = await api.get<AnalyticsSummary>("/v1/analytics/summary");

    const notifs = [];

    if (summary.completed_count > 0) {
      notifs.push({
        id: "1", icon: "payments", color: "#10b981", read: false, tag: "pago" as const,
        title: `${summary.completed_count} pago${summary.completed_count > 1 ? "s" : ""} completado${summary.completed_count > 1 ? "s" : ""}`,
        body: `Volumen total cobrado: ${formatUSD(parseFloat(summary.total_amount_completed))}`,
        time: "Hoy",
      });
    }

    if (summary.failed_count > 0) {
      notifs.push({
        id: "2", icon: "error_outline", color: "#ef4444", read: false, tag: "alerta" as const,
        title: `${summary.failed_count} transacción${summary.failed_count > 1 ? "es" : ""} fallida${summary.failed_count > 1 ? "s" : ""}`,
        body: "Revisa el detalle en la sección Transacciones para más información.",
        time: "Hoy",
      });
    }

    if (summary.pending_count > 0) {
      notifs.push({
        id: "3", icon: "schedule", color: "#F89937", read: false, tag: "alerta" as const,
        title: `${summary.pending_count} pago${summary.pending_count > 1 ? "s" : ""} pendiente${summary.pending_count > 1 ? "s" : ""}`,
        body: "Esperando confirmación del procesador de pagos.",
        time: "Hoy",
      });
    }

    notifs.push({
      id: "4", icon: "account_balance", color: "#8b5cf6", read: true, tag: "liquidacion" as const,
      title: "Próxima liquidación programada",
      body: "Tu saldo disponible será acreditado el próximo viernes hábil.",
      time: "Esta semana",
    });

    notifs.push({
      id: "5", icon: "security", color: "#0066FF", read: true, tag: "sistema" as const,
      title: "Modo de prueba activo",
      body: "Tu cuenta está en modo prueba. Las transacciones no generan cobros reales.",
      time: "Siempre",
    });

    notifs.push({
      id: "6", icon: "new_releases", color: "#003358", read: true, tag: "sistema" as const,
      title: "Bienvenido a MediaNetPay",
      body: "Tu cuenta fue creada exitosamente. Crea tu primer link de cobro para empezar.",
      time: "Al registrarte",
    });

    return notifs;
  } catch {
    return [];
  }
}

export default async function NotificationsPage() {
  const notifs = await getNotifications();
  return <NotificationsClient initial={notifs} />;
}
