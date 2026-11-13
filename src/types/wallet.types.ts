import type { PaymentMethod } from '../constants/payment-methods.constants.ts';

/** Estado local de un intento de recarga en la app. */
export const AttemptStatus = {
  SENDING: 'sending',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  /** Error que no es de la operación: 4xx de validación, 5xx o sin conexión. */
  ERROR: 'error',
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

/** Resultado que la pasarela simulada notifica por webhook. */
export const WebhookStatus = {
  APPROVED: 'approved',
  DECLINED: 'declined',
} as const;
export type WebhookStatus = (typeof WebhookStatus)[keyof typeof WebhookStatus];

/** Qué hizo el backend con un webhook: lo aplicó, lo ignoró por duplicado, lo rechazó… */
export const WebhookOutcome = {
  APPLIED: 'applied',
  DUPLICATE: 'duplicate',
  CONFLICT: 'conflict',
  IGNORED: 'ignored',
  /** Sin respuesta o con un error HTTP (p. ej. 401 por firma inválida). */
  ERROR: 'error',
} as const;
export type WebhookOutcome = (typeof WebhookOutcome)[keyof typeof WebhookOutcome];

/** Un webhook enviado para un intento y lo que respondió el backend. */
export interface WebhookNotice {
  status: WebhookStatus;
  outcome: WebhookOutcome;
  httpStatus: number;
}

/** Un intento de recarga: una Idempotency-Key y todas las requests enviadas con ella. */
export interface RechargeAttempt {
  idempotencyKey: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: AttemptStatus;
  operationId: string | null;
  newBalance: number | null;
  failureReason: string | null;
  /** Último mensaje de error (validación, BD caída, sin conexión…). */
  errorMessage: string | null;
  /** Cuántas requests se enviaron con esta key (clicks + reintentos). */
  requestsSent: number;
  lastHttpStatus: number | null;
  /** Segundos que pidió esperar el servidor antes de reintentar. */
  retryAfterSeconds: number | null;
  /** Webhooks que la pasarela simulada envió para esta operación, en orden. */
  webhooks: WebhookNotice[];
  createdAt: number;
}

export const FINAL_ATTEMPT_STATUSES: readonly AttemptStatus[] = [
  AttemptStatus.COMPLETED,
  AttemptStatus.FAILED,
];
