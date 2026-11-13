import { CURRENCY, PaymentMethod } from '../../constants/payment-methods.constants.ts';
import type { ApiCall } from '../../types/api-call.types.ts';
import type { CashInRequestBody, CashInResponseBody } from '../../types/cash-in.types.ts';
import type { ScenarioCheck, ScenarioContext } from '../../types/scenario.types.ts';

export const DEFAULT_AMOUNT = 100;
const SECOND_MS = 1000;

export const cashInBody = (
  userId: string,
  paymentMethod: string = PaymentMethod.APPROVE,
  amount: number = DEFAULT_AMOUNT,
): CashInRequestBody => ({
  user_id: userId,
  amount,
  currency: CURRENCY,
  payment_method: paymentMethod,
});

export const check = (label: string, passed: boolean, detail?: string): ScenarioCheck => ({
  label,
  passed,
  detail,
});

export const operationIdOf = (call: ApiCall<CashInResponseBody>): string | undefined =>
  call.responseBody?.operation_id;

export const statusesOf = (calls: ApiCall[]): string => calls.map((call) => call.status).join(', ');

interface PollOptions {
  context: ScenarioContext;
  podIndex: number;
  idempotencyKey: string;
  body: CashInRequestBody;
  timeoutMs: number;
  /** Mensaje de progreso; recibe los segundos transcurridos. */
  waitingMessage: (elapsedSeconds: number) => string;
}

/**
 * Reintenta con la MISMA key (como la app) hasta obtener un resultado final (200 o 402).
 * Tolera respuestas 202, 503 y "sin conexión" mientras espera.
 */
export const pollUntilFinal = async ({
  context,
  podIndex,
  idempotencyKey,
  body,
  timeoutMs,
  waitingMessage,
}: PollOptions): Promise<{
  final: ApiCall<CashInResponseBody> | null;
  calls: ApiCall<CashInResponseBody>[];
}> => {
  const startedAt = Date.now();
  const calls: ApiCall<CashInResponseBody>[] = [];
  while (Date.now() - startedAt < timeoutMs) {
    const call = await context.cashIn(podIndex, idempotencyKey, body);
    calls.push(call);
    if (call.status === 200 || call.status === 402) {
      return { final: call, calls };
    }
    const elapsedSeconds = Math.round((Date.now() - startedAt) / SECOND_MS);
    context.progress(waitingMessage(elapsedSeconds));
    await context.sleep((call.retryAfterSeconds ?? 2) * SECOND_MS);
  }
  return { final: null, calls };
};
