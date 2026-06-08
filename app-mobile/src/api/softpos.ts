import { apiClient } from './client';

export interface SoftPOSChargeRequest {
  amount:               number;
  description:          string;
  idempotency_key:      string;
  card_token:           '4242' | '0002' | '5500';
  customer_name?:       string;
  customer_id_type?:    'ruc' | 'cedula' | 'pasaporte' | 'consumidor_final';
  customer_ruc_cedula?: string;
  customer_email?:      string;
  customer_phone?:      string;
  customer_address?:    string;
  installments?:        number;
  currency?:            string;
}

export interface SoftPOSChargeResponse {
  transaction_id:     string;
  status:             'completed' | 'failed';
  amount:             string;
  currency:           string;
  card_brand:         string;
  card_last4:         string;
  authorization_code: string | null;
  medianet_ref:       string | null;
  description:        string;
}

export async function softposCharge(
  body: SoftPOSChargeRequest,
): Promise<SoftPOSChargeResponse> {
  const { data } = await apiClient.post<SoftPOSChargeResponse>(
    '/v1/softpos/charge',
    body,
  );
  return data;
}
