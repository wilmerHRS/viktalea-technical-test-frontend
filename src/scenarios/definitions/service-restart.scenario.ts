import { PaymentMethod } from '../../constants/payment-methods.constants.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check, operationIdOf, pollUntilFinal } from '../utils/scenario.util.ts';

/** Reinicio + RECONCILE_AFTER_MS (30 s) + RECONCILE_INTERVAL_MS (30 s) con margen. */
const RECOVERY_WAIT_MS = 180_000;

export const serviceRestartScenario: Scenario = {
  id: 'service-restart',
  title: 'Reinicio del servicio durante la operación',
  expected:
    'Si el servicio muere a mitad de un cobro, la operación no puede quedar colgada para siempre ni cobrarse dos veces.',
  mechanism:
    'La operación se guarda (PROCESSING) antes de cobrar. Al volver, el reconciliador retoma las PROCESSING atascadas y pregunta a la pasarela: si el cobro nunca llegó, la operación queda FAILED.',
  kind: ScenarioKind.GUIDED,
  instructions: [
    'Pulsa "Ejecutar": empieza un cobro lento (la pasarela tarda 3 s).',
    'ANTES de 3 s, detén el backend (Ctrl+C en su terminal) y vuelve a levantarlo (npm run dev).',
    'El escenario reintenta con la misma key hasta ver el resultado final (puede tardar ~1 min: RECONCILE_AFTER_MS + intervalo).',
  ],
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId, PaymentMethod.SLOW);

    context.progress('Cobro lento en curso: ¡detén y reinicia el backend ahora!');
    const original = await context.cashIn(0, key, body);
    if (original.status !== 0) {
      return {
        summary: `La operación terminó normal (HTTP ${original.status})`,
        checks: [
          check(
            'El backend se reinició durante el cobro',
            false,
            'No se detuvo a tiempo: hay que pararlo antes de 3 s',
          ),
        ],
      };
    }

    const { final, calls } = await pollUntilFinal({
      context,
      podIndex: 0,
      idempotencyKey: key,
      body,
      timeoutMs: RECOVERY_WAIT_MS,
      waitingMessage: (seconds) =>
        `Servidor reiniciado: esperando al reconciliador… ${seconds} s (reintentando con la misma key)`,
    });
    const ids = new Set(calls.map(operationIdOf).filter(Boolean));

    return {
      summary: `pod caído → … → HTTP ${final?.status ?? 'sin resultado'}`,
      checks: [
        check('La request se cortó por el reinicio', original.status === 0, original.networkError),
        check('La operación no quedó colgada: tiene resultado final', final !== null),
        check('Una sola operación para la key', ids.size === 1, [...ids].join(', ')),
        check(
          'El cobro nunca llegó a la pasarela → FAILED, sin abono',
          final?.responseBody?.status === 'failed',
          final?.responseBody?.failure_reason,
        ),
      ],
    };
  },
};
