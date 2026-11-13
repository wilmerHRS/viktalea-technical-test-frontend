import type { ApiCall } from '../types/api-call.types.ts';
import type { PaymentWebhookResponseBody } from '../types/cash-in.types.ts';
import { WebhookOutcome, type WebhookNotice, type WebhookStatus } from '../types/wallet.types.ts';

const HTTP_OK = 200;

/** Traduce la respuesta del backend a un webhook en lo que hizo con él (función pura). */
export const toWebhookNotice = (
  status: WebhookStatus,
  call: ApiCall<PaymentWebhookResponseBody>,
): WebhookNotice => ({
  status,
  outcome: outcomeOf(call),
  httpStatus: call.status,
});

const outcomeOf = (call: ApiCall<PaymentWebhookResponseBody>): WebhookOutcome => {
  const body = call.responseBody;
  if (call.status !== HTTP_OK || body === null) {
    return WebhookOutcome.ERROR;
  }
  if (body.duplicate) {
    return WebhookOutcome.DUPLICATE;
  }
  return body.result ?? WebhookOutcome.IGNORED;
};
