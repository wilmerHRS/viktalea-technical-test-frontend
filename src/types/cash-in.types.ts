import type { PaymentMethod } from '../constants/payment-methods.constants.ts';

/** Estado de una operación tal como lo devuelve la API. */
export const OperationStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type OperationStatus = (typeof OperationStatus)[keyof typeof OperationStatus];

/** Body de POST /cash-in. */
export interface CashInRequestBody {
  user_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | string;
}

/** Respuesta de POST /cash-in (200, 202 o 402). */
export interface CashInResponseBody {
  operation_id: string;
  status: OperationStatus;
  amount: number;
  new_balance?: number;
  failure_reason?: string;
}

/** Body de error de la API: `{ error: { code, message } }`. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
}

/** Evento que la pasarela envía a POST /webhooks/payment. */
export interface PaymentWebhookPayload {
  event_id: string;
  operation_id: string;
  status: 'approved' | 'declined';
  provider_charge_id?: string;
}

/** Respuesta de POST /webhooks/payment. */
export interface PaymentWebhookResponseBody {
  received: true;
  result?: 'applied' | 'ignored' | 'conflict';
  duplicate?: true;
}
