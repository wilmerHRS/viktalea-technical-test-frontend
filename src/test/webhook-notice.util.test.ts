import { describe, expect, it } from 'vitest';
import type { ApiCall } from '../types/api-call.types.ts';
import type { PaymentWebhookResponseBody } from '../types/cash-in.types.ts';
import { WebhookOutcome, WebhookStatus } from '../types/wallet.types.ts';
import { toWebhookNotice } from '../utils/webhook-notice.util.ts';

const call = (status: number, responseBody: PaymentWebhookResponseBody | null) =>
  ({
    id: 'call',
    source: 'test',
    method: 'POST',
    pod: 'http://localhost:3000',
    path: '/webhooks/payment',
    requestBody: {},
    status,
    responseBody,
    retryAfterSeconds: null,
    durationMs: 1,
    startedAt: 0,
  }) as ApiCall<PaymentWebhookResponseBody>;

describe('toWebhookNotice', () => {
  it('devuelve lo que el backend hizo con el webhook', () => {
    const applied = toWebhookNotice(
      WebhookStatus.APPROVED,
      call(200, { received: true, result: 'applied' }),
    );
    const conflict = toWebhookNotice(
      WebhookStatus.DECLINED,
      call(200, { received: true, result: 'conflict' }),
    );

    expect(applied.outcome).toBe(WebhookOutcome.APPLIED);
    expect(conflict.outcome).toBe(WebhookOutcome.CONFLICT);
  });

  it('distingue un webhook duplicado', () => {
    const notice = toWebhookNotice(
      WebhookStatus.APPROVED,
      call(200, { received: true, duplicate: true }),
    );

    expect(notice.outcome).toBe(WebhookOutcome.DUPLICATE);
  });

  it('marca como error una firma inválida o la falta de respuesta', () => {
    const unauthorized = toWebhookNotice(WebhookStatus.APPROVED, call(401, null));
    const noResponse = toWebhookNotice(WebhookStatus.APPROVED, call(0, null));

    expect(unauthorized).toEqual({
      status: WebhookStatus.APPROVED,
      outcome: WebhookOutcome.ERROR,
      httpStatus: 401,
    });
    expect(noResponse.outcome).toBe(WebhookOutcome.ERROR);
  });
});
