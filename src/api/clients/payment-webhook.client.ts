import type { ApiCall } from '../../types/api-call.types.ts';
import type {
  PaymentWebhookPayload,
  PaymentWebhookResponseBody,
} from '../../types/cash-in.types.ts';
import { hmacSha256Hex } from '../utils/hmac.util.ts';
import { postJson } from './http.client.ts';

export const PAYMENT_WEBHOOK_PATH = '/webhooks/payment';
const SIGNATURE_HEADER = 'X-Signature';

/**
 * Simula a la PASARELA enviando un webhook firmado con HMAC-SHA256.
 * Solo para desarrollo: en producción la firma la hace la pasarela, nunca el navegador.
 */
export const postPaymentWebhook = async (
  source: string,
  pod: string,
  payload: PaymentWebhookPayload,
  secret: string,
): Promise<ApiCall<PaymentWebhookResponseBody>> => {
  const rawBody = JSON.stringify(payload);
  const signature = await hmacSha256Hex(secret, rawBody);
  return postJson<PaymentWebhookResponseBody>({
    source,
    pod,
    path: PAYMENT_WEBHOOK_PATH,
    headers: { [SIGNATURE_HEADER]: signature },
    rawBody,
  });
};
