import type { ApiCall } from '../../types/api-call.types.ts';
import type { CashInRequestBody, CashInResponseBody } from '../../types/cash-in.types.ts';
import { postJson } from './http.client.ts';

export const CASH_IN_PATH = '/cash-in';
const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** POST /cash-in con su Idempotency-Key, como lo haría la app. */
export const postCashIn = (
  source: string,
  pod: string,
  idempotencyKey: string,
  body: CashInRequestBody,
): Promise<ApiCall<CashInResponseBody>> =>
  postJson<CashInResponseBody>({
    source,
    pod,
    path: CASH_IN_PATH,
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    rawBody: JSON.stringify(body),
    idempotencyKey,
  });
