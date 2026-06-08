export interface Transaction {
  id: string;
  merchant_id: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string | null;
  installments: number;
  idempotency_key: string;
  medianet_ref: string | null;
  description: string | null;
  // ── Datos del comprador ───────────────────────────────────────────────────
  customer_email: string | null;
  customer_name: string | null;
  customer_ruc_cedula: string | null;
  customer_id_type: 'ruc' | 'cedula' | 'pasaporte' | 'consumidor_final' | null;
  customer_phone: string | null;
  customer_address: string | null;
  // ── Factura electrónica SRI ───────────────────────────────────────────────
  invoice_status: 'emitted' | 'authorized' | 'cancelled' | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TransactionLog {
  id: string;
  from_status: string | null;
  to_status: string;
  triggered_by: string;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  token: string;
  amount: string | null;
  currency: string;
  description: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  status: string;
  qr_png_url: string | null;
  checkout_url: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_transactions: number;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  reversed_count: number;
  total_amount_completed: string;
  currency: string;
  date_from: string | null;
  date_to: string | null;
}

// ── Analytics informal ────────────────────────────────────────────────────────

export interface HourlyBucket {
  hour: number;
  label: string;
  cobros: number;
  total: string;
}

export interface HourlyAnalytics {
  data: HourlyBucket[];
  peak_hour: number | null;
  peak_label: string | null;
  peak_total: string;
}

export interface WeeklyBucket {
  dow: number;
  label: string;
  cobros: number;
  total: string;
}

export interface WeeklyAnalytics {
  data: WeeklyBucket[];
  best_day: string | null;
  best_total: string;
}

export interface FrequentCustomer {
  ruc_cedula: string;
  name: string | null;
  veces: number;
  total_pagado: string;
  ultimo_pago: string;
}

export interface CustomersAnalytics {
  data: FrequentCustomer[];
  total_repeat: number;
}

// ── Merchant ──────────────────────────────────────────────────────────────────

export interface MerchantProfile {
  id: string;
  business_name: string;
  ruc: string;
  email: string;
  api_key_public: string;
  webhook_url: string | null;
  status: string;
  test_mode: boolean;
  created_at: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
