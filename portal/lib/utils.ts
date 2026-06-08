import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number | string): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
  reversed: "Reversado",
  refunded: "Reembolsado",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  reversed: "bg-orange-100 text-orange-800",
  refunded: "bg-gray-100 text-gray-700",
};
