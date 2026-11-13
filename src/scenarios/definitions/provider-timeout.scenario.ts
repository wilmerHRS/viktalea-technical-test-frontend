import { PaymentMethod } from '../../constants/payment-methods.constants.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import {
  cashInBody,
  check,
  DEFAULT_AMOUNT,
  operationIdOf,
  pollUntilFinal,
} from '../utils/scenario.util.ts';

/** El reconciliador corre cada RECONCILE_INTERVAL_MS (30 s por defecto en el backend). */
const RECONCILER_WAIT_MS = 120_000;

export const providerTimeoutScenario: Scenario = {
  id: 'provider-timeout',
  title: 'Timeout del proveedor (pregunta central)',
  expected:
    'La pasarela cobra S/100 pero no responde a tiempo; no sabemos si cobró y el cliente reintenta. NO se debe cobrar dos veces.',
  mechanism:
    'La operación queda UNKNOWN y la API responde 202 sin reintentar el cobro. El reintento del cliente (misma key) recibe el estado actual. El reconciliador consulta a la pasarela y la liquida una sola vez.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId, PaymentMethod.TIMEOUT_AFTER_CHARGE);

    context.progress('1/3 La pasarela cobra pero su respuesta se pierde…');
    const first = await context.cashIn(0, key, body);
    context.progress('2/3 El cliente reintenta con la misma key…');
    const retry = await context.cashIn(0, key, body);

    const { final, calls } = await pollUntilFinal({
      context,
      podIndex: 0,
      idempotencyKey: key,
      body,
      timeoutMs: RECONCILER_WAIT_MS,
      waitingMessage: (seconds) =>
        `3/3 Esperando al reconciliador (cada RECONCILE_INTERVAL_MS)… ${seconds} s`,
    });
    const ids = new Set([first, retry, ...calls].map(operationIdOf).filter(Boolean));

    return {
      summary: `202 → reintento ${retry.status} → … → ${final?.status ?? 'sin resultado'}`,
      checks: [
        check(
          'Primera respuesta: 202 pending con Retry-After',
          first.status === 202 && first.retryAfterSeconds !== null,
        ),
        check(
          'El reintento NO crea otra operación (misma operation_id)',
          ids.size === 1,
          [...ids].join(', '),
        ),
        check(
          'El reconciliador la resuelve como completada',
          final?.status === 200,
          `HTTP ${final?.status ?? '—'}`,
        ),
        check(
          `Se cobró y acreditó UNA vez (saldo ${DEFAULT_AMOUNT})`,
          final?.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${final?.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
