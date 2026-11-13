import type { ApiCall } from '../../types/api-call.types.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check, DEFAULT_AMOUNT } from '../utils/scenario.util.ts';

const RETRIES = 3;

export const appRetryScenario: Scenario = {
  id: 'app-retry',
  title: 'Retry automático de la app',
  expected:
    'Si la app reintenta la misma recarga (p. ej. porque se cortó la red), no se cobra otra vez y recibe la misma respuesta.',
  mechanism:
    'El reintento usa la misma Idempotency-Key: el backend devuelve el estado de la operación ya registrada (reconstruido desde la BD, con el mismo new_balance) sin llamar a la pasarela.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId);
    const calls: ApiCall[] = [];

    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      context.progress(`Intento ${attempt} de ${RETRIES} con la misma key…`);
      calls.push(await context.cashIn(0, key, body));
    }
    const distinctBodies = new Set(calls.map((call) => JSON.stringify(call.responseBody)));
    const lastBody = calls.at(-1)?.responseBody as { new_balance?: number } | undefined;

    return {
      summary: `${RETRIES} intentos → ${distinctBodies.size === 1 ? 'misma respuesta' : 'respuestas distintas'}`,
      checks: [
        check(
          'Todas las respuestas son idénticas',
          distinctBodies.size === 1,
          `${distinctBodies.size} distinta(s)`,
        ),
        check(
          `Se acreditó UNA vez (saldo ${DEFAULT_AMOUNT})`,
          lastBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${lastBody?.new_balance}`,
        ),
      ],
    };
  },
};
