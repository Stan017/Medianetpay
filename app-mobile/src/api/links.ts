import { apiClient } from './client';

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
  checkout_url: string;
  created_at: string;
}

export interface CreateLinkParams {
  amount: number;
  description: string;
  currency?: string;
  max_uses?: number;
  expires_at?: string;   // ISO 8601
}

export async function createLink(params: CreateLinkParams): Promise<PaymentLink> {
  const { data } = await apiClient.post<PaymentLink>('/v1/links', {
    amount: params.amount,
    description: params.description,
    currency: params.currency ?? 'USD',
    max_uses: params.max_uses ?? 1,
    expires_at: params.expires_at,
  });
  return data;
}

export async function getLinkById(linkId: string): Promise<PaymentLink> {
  const { data } = await apiClient.get<PaymentLink>(`/v1/links/${linkId}`);
  return data;
}
