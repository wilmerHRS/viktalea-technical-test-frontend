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
  createdAt: number;
}

export const FINAL_ATTEMPT_STATUSES: readonly AttemptStatus[] = [
  AttemptStatus.COMPLETED,
  AttemptStatus.FAILED,
];
