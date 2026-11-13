import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import {
  cashInBody,
  check,
  DEFAULT_AMOUNT,
  operationIdOf,
  pollUntilFinal,
  statusesOf,
} from '../utils/scenario.util.ts';

export const doubleClickScenario: Scenario = {
  id: 'double-click',
  title: 'Doble click del usuario',
  expected: 'Dos clicks seguidos sobre "Recargar" generan UN solo cobro y UN solo abono.',
  mechanism:
    'Los dos clicks envían la misma Idempotency-Key. PostgreSQL deja registrar la operación una sola vez (UNIQUE + ON CONFLICT DO NOTHING); la segunda request recibe la operación existente.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId);

    context.progress('Enviando 2 clicks a la vez con la misma key…');
    const clicks = await Promise.all([context.cashIn(0, key, body), context.cashIn(0, key, body)]);
    const ids = new Set(clicks.map(operationIdOf));

    context.progress('Consultando el resultado final…');
    const { final } = await pollUntilFinal({
      context,
      podIndex: 0,
      idempotencyKey: key,
      body,
      timeoutMs: 15_000,
      waitingMessage: (seconds) => `Esperando el resultado final (${seconds} s)…`,
    });

    return {
      summary: `HTTP ${statusesOf(clicks)} → saldo final ${final?.responseBody?.new_balance ?? '?'}`,
      checks: [
        check('Las dos requests apuntan a la MISMA operación', ids.size === 1, [...ids].join(', ')),
        check(
          `Se acreditó UNA vez (saldo ${DEFAULT_AMOUNT}, no ${DEFAULT_AMOUNT * 2})`,
          final?.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${final?.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
