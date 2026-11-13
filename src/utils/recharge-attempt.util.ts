import type { PaymentMethod } from '../constants/payment-methods.constants.ts';
import type { ApiCall } from '../types/api-call.types.ts';
import {
  OperationStatus,
  type ApiErrorBody,
  type CashInResponseBody,
} from '../types/cash-in.types.ts';
import { AttemptStatus, type RechargeAttempt } from '../types/wallet.types.ts';

const NO_CONNECTION_MESSAGE = 'Sin conexión con el backend';

export const createAttempt = (amount: number, paymentMethod: PaymentMethod): RechargeAttempt => ({
  idempotencyKey: crypto.randomUUID(),
  amount,
  paymentMethod,
  status: AttemptStatus.SENDING,
  operationId: null,
  newBalance: null,
  failureReason: null,
  errorMessage: null,
  requestsSent: 0,
  lastHttpStatus: null,
  retryAfterSeconds: null,
  createdAt: Date.now(),
});

const STATUS_BY_OPERATION: Record<OperationStatus, AttemptStatus> = {
  [OperationStatus.PENDING]: AttemptStatus.PENDING,
  [OperationStatus.COMPLETED]: AttemptStatus.COMPLETED,
  [OperationStatus.FAILED]: AttemptStatus.FAILED,
};

const isCashInBody = (body: unknown): body is CashInResponseBody =>
  typeof body === 'object' && body !== null && 'operation_id' in body;

const isErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === 'object' && body !== null && 'error' in body;

/** Aplica la respuesta de una request al intento (función pura, fácil de testear). */
export const applyCashInResponse = (
  attempt: RechargeAttempt,
  call: ApiCall<CashInResponseBody>,
): RechargeAttempt => {
  const updated: RechargeAttempt = {
    ...attempt,
    lastHttpStatus: call.status,
    retryAfterSeconds: call.retryAfterSeconds,
  };
  const body: unknown = call.responseBody;

  if (isCashInBody(body)) {
    return {
      ...updated,
      status: STATUS_BY_OPERATION[body.status],
      operationId: body.operation_id,
      newBalance: body.new_balance ?? updated.newBalance,
      failureReason: body.failure_reason ?? null,
      errorMessage: null,
    };
  }

  // Un error no cambia el estado de la operación si ya tenía uno: solo informa.
  const errorMessage = isErrorBody(body)
    ? `${body.error.code}: ${body.error.message}`
    : (call.networkError ?? NO_CONNECTION_MESSAGE);
  const status = attempt.operationId ? attempt.status : AttemptStatus.ERROR;
  return { ...updated, status, errorMessage };
};

/** Saldo de la cuenta: el `new_balance` más alto visto (los abonos solo suman). */
export const balanceFromAttempts = (attempts: RechargeAttempt[]): number =>
  attempts.reduce((balance, attempt) => Math.max(balance, attempt.newBalance ?? 0), 0);
