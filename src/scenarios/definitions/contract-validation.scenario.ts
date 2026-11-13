import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check } from '../utils/scenario.util.ts';

const INVALID_SECRET = 'not_the_webhook_secret';

export const contractValidationScenario: Scenario = {
  id: 'contract-validation',
  title: 'Validaciones del contrato',
  expected:
    'La API rechaza lo que no cumple el contrato: key reutilizada con otro payload, key inválida y webhooks sin firma válida.',
  mechanism:
    'Hash del payload guardado con la operación (422 si cambia), validación zod del header y del body (400) y firma HMAC-SHA256 del body crudo con timingSafeEqual (401).',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const key = context.newIdempotencyKey();

    await context.cashIn(0, key, cashInBody(userId));
    const reused = await context.cashIn(0, key, cashInBody(userId, undefined, 50));
    const invalidKey = await context.cashIn(0, 'not-a-uuid', cashInBody(userId));
    const invalidAmount = await context.cashIn(
      0,
      context.newIdempotencyKey(),
      cashInBody(userId, undefined, 1.005),
    );
    const badSignature = await context.webhook(
      0,
      { event_id: 'evt_x', operation_id: 'op_x', status: 'declined' },
      { secret: INVALID_SECRET },
    );

    return {
      summary: `${reused.status} · ${invalidKey.status} · ${invalidAmount.status} · ${badSignature.status}`,
      checks: [
        check('Misma key con otro monto → 422', reused.status === 422),
        check('Idempotency-Key que no es UUID → 400', invalidKey.status === 400),
        check('Monto con más de 2 decimales → 400', invalidAmount.status === 400),
        check('Webhook con firma inválida → 401', badSignature.status === 401),
      ],
    };
  },
};
