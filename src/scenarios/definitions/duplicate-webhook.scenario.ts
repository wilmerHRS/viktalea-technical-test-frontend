import { PaymentMethod } from '../../constants/payment-methods.constants.ts';
import type { PaymentWebhookResponseBody } from '../../types/cash-in.types.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check, DEFAULT_AMOUNT } from '../utils/scenario.util.ts';

export const duplicateWebhookScenario: Scenario = {
  id: 'duplicate-webhook',
  title: 'Webhook duplicado',
  expected:
    'La pasarela envía el mismo webhook dos veces (incluso a la vez, a pods distintos): un solo efecto.',
  mechanism:
    'webhook_events.event_id es clave primaria y se inserta en la MISMA transacción que el efecto: la segunda entrega no inserta nada y responde duplicate: true.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId, PaymentMethod.TIMEOUT);

    context.progress('Creando una operación pendiente…');
    const pending = await context.cashIn(0, key, body);
    const operationId = pending.responseBody?.operation_id ?? '';
    const payload = {
      event_id: `evt_${crypto.randomUUID()}`,
      operation_id: operationId,
      status: 'approved' as const,
      provider_charge_id: 'ch_simulado',
    };

    context.progress('La pasarela envía el mismo evento 2 veces a la vez…');
    const deliveries = await Promise.all([
      context.webhook(0, payload),
      context.webhook(1 % context.pods.length, payload),
    ]);
    const bodies = deliveries.map((call) => call.responseBody as PaymentWebhookResponseBody | null);
    const applied = bodies.filter((response) => response?.result === 'applied').length;
    const duplicates = bodies.filter((response) => response?.duplicate).length;
    const after = await context.cashIn(0, key, body);

    return {
      summary: `${applied} aplicado, ${duplicates} duplicado`,
      checks: [
        check('Operación pendiente (202)', pending.status === 202),
        check('Una entrega se aplica', applied === 1),
        check('La otra se descarta como duplicada', duplicates === 1),
        check(
          `Se acreditó UNA vez (saldo ${DEFAULT_AMOUNT})`,
          after.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${after.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
