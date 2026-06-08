import { apiClient } from './client';

export interface Transaction {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'refunded';
  description: string | null;
  created_at: string;
  payment_link_id: string | null;
}

export interface TransactionsPage {
  data: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnalyticsSummary {
  total_transactions: number;
  completed_count: number;
  failed_count: number;
  pending_count: number;
  total_amount_completed: string;
  currency: string;
}

export async function listTransactions(params?: {
  link_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
}): Promise<TransactionsPage> {
  const { data } = await apiClient.get<TransactionsPage>('/v1/transactions', {
    params: {
      link_id: params?.link_id,
      status: params?.status,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 20,
      date_from: params?.date_from,
      date_to: params?.date_to,
    },
  });
  return data;
}

export async function getAnalyticsSummary(dateFrom?: string): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get<AnalyticsSummary>('/v1/analytics/summary', {
    params: { date_from: dateFrom },
  });
  return data;
}
