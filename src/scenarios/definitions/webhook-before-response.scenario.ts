import { PaymentMethod } from '../../constants/payment-methods.constants.ts';
import type { PaymentWebhookResponseBody } from '../../types/cash-in.types.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check, DEFAULT_AMOUNT } from '../utils/scenario.util.ts';

const PROBE_DELAY_MS = 400;

export const webhookBeforeResponseScenario: Scenario = {
  id: 'webhook-before-response',
  title: 'Webhook antes que la respuesta del API',
  expected:
    'La pasarela avisa por webhook ANTES de responder a la API: la operación se liquida una sola vez y la API devuelve el resultado correcto.',
  mechanism:
    'La operación se guarda antes de cobrar, así que el webhook la encuentra y la liquida. Cuando la pasarela responde a la API, la liquidación es condicional y ya no aplica nada.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId, PaymentMethod.SLOW);

    context.progress('Cobro lento en curso (la pasarela tarda 3 s)…');
    const slowRequest = context.cashIn(0, key, body);
    await context.sleep(PROBE_DELAY_MS);
    // Un reintento con la misma key revela el operation_id mientras la API sigue esperando.
    const probe = await context.cashIn(1 % context.pods.length, key, body);
    const operationId = probe.responseBody?.operation_id ?? '';

    context.progress('El webhook llega antes que la respuesta de la pasarela…');
    const early = await context.webhook(1 % context.pods.length, {
      event_id: `evt_${crypto.randomUUID()}`,
      operation_id: operationId,
      status: 'approved',
      provider_charge_id: 'ch_simulado',
    });
    const earlyBody = early.responseBody as PaymentWebhookResponseBody | null;
    const response = await slowRequest;

    return {
      summary: `webhook ${earlyBody?.result ?? early.status} → API ${response.status}`,
      checks: [
        check('Mientras cobra, la operación ya existe (202 pending)', probe.status === 202),
        check('El webhook se aplica antes de la respuesta', earlyBody?.result === 'applied'),
        check('La API responde completada (200)', response.status === 200),
        check(
          `Se acreditó UNA vez (saldo ${DEFAULT_AMOUNT})`,
          response.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${response.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
