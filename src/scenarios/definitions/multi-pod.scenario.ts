import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import {
  cashInBody,
  check,
  DEFAULT_AMOUNT,
  operationIdOf,
  pollUntilFinal,
  statusesOf,
} from '../utils/scenario.util.ts';

const PARALLEL_REQUESTS = 10;

export const multiPodScenario: Scenario = {
  id: 'multi-pod',
  title: 'Múltiples pods concurrentes',
  expected:
    'La misma recarga llega a la vez a varios pods (réplicas del servicio): solo uno procesa la operación.',
  mechanism:
    'La exclusión no vive en memoria (cada pod tiene la suya) sino en PostgreSQL, compartido por todos: la restricción UNIQUE de la idempotency key decide quién gana.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId);

    context.progress(
      `Enviando ${PARALLEL_REQUESTS} requests repartidas entre ${context.pods.length} pod(s)…`,
    );
    const calls = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, (_, index) =>
        context.cashIn(index % context.pods.length, key, body),
      ),
    );
    const ids = new Set(calls.map(operationIdOf));
    const { final } = await pollUntilFinal({
      context,
      podIndex: 0,
      idempotencyKey: key,
      body,
      timeoutMs: 15_000,
      waitingMessage: (seconds) => `Esperando el resultado final (${seconds} s)…`,
    });

    return {
      summary: `HTTP ${statusesOf(calls)}`,
      checks: [
        check(
          'Hay al menos 2 pods configurados (VITE_API_URLS)',
          context.pods.length >= 2,
          context.pods.length >= 2
            ? context.pods.join(' y ')
            : 'Solo hay 1 pod: levanta otro con PORT=3001 npm run dev en el backend',
        ),
        check(
          'Todas las requests apuntan a la MISMA operación',
          ids.size === 1,
          [...ids].join(', '),
        ),
        check(
          `Se acreditó UNA vez (saldo ${DEFAULT_AMOUNT})`,
          final?.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${final?.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
