import type { PaymentWebhookResponseBody } from '../../types/cash-in.types.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check, DEFAULT_AMOUNT } from '../utils/scenario.util.ts';

export const outOfOrderWebhookScenario: Scenario = {
  id: 'out-of-order-webhook',
  title: 'Webhook fuera de orden',
  expected:
    'Llega un evento viejo o contradictorio (p. ej. "declined" cuando la operación ya está completada): no debe deshacer ni duplicar nada.',
  mechanism:
    'Los estados finales son inmutables: la transición es un UPDATE … WHERE status IN (PROCESSING, UNKNOWN). Un evento que contradice el estado final se registra como "conflict" y se loguea para revisión.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();
    const body = cashInBody(userId);

    context.progress('Completando una recarga…');
    const completed = await context.cashIn(0, key, body);
    context.progress('Llega tarde un webhook "declined"…');
    const late = await context.webhook(0, {
      event_id: `evt_${crypto.randomUUID()}`,
      operation_id: completed.responseBody?.operation_id ?? '',
      status: 'declined',
    });
    const lateBody = late.responseBody as PaymentWebhookResponseBody | null;
    const after = await context.cashIn(0, key, body);

    return {
      summary: `webhook tardío → ${lateBody?.result ?? late.status}`,
      checks: [
        check('La recarga estaba completada (200)', completed.status === 200),
        check(
          'El evento contradictorio se registra como conflict',
          lateBody?.result === 'conflict',
        ),
        check('La operación sigue completada', after.responseBody?.status === 'completed'),
        check(
          `El saldo no cambia (${DEFAULT_AMOUNT})`,
          after.responseBody?.new_balance === DEFAULT_AMOUNT,
          `new_balance = ${after.responseBody?.new_balance}`,
        ),
      ],
    };
  },
};
