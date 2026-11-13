import { describe, expect, it } from 'vitest';
import { PaymentMethod } from '../constants/payment-methods.constants.ts';
import type { ApiCall } from '../types/api-call.types.ts';
import type { CashInResponseBody } from '../types/cash-in.types.ts';
import { AttemptStatus } from '../types/wallet.types.ts';
import {
  applyCashInResponse,
  balanceFromAttempts,
  createAttempt,
} from '../utils/recharge-attempt.util.ts';

const call = (status: number, responseBody: unknown, retryAfterSeconds: number | null = null) =>
  ({
    id: 'call',
    source: 'test',
    method: 'POST',
    pod: 'http://localhost:3000',
    path: '/cash-in',
    requestBody: {},
    status,
    responseBody,
    retryAfterSeconds,
    durationMs: 1,
    startedAt: 0,
  }) as ApiCall<CashInResponseBody>;

describe('applyCashInResponse', () => {
  it('202 deja el intento pendiente con su Retry-After', () => {
    const attempt = createAttempt(100, PaymentMethod.TIMEOUT_AFTER_CHARGE);

    const updated = applyCashInResponse(
      attempt,
      call(202, { operation_id: 'op_1', status: 'pending', amount: 100 }, 2),
    );

    expect(updated.status).toBe(AttemptStatus.PENDING);
    expect(updated.operationId).toBe('op_1');
    expect(updated.retryAfterSeconds).toBe(2);
  });

  it('200 completa el intento con el saldo resultante', () => {
    const attempt = createAttempt(100, PaymentMethod.APPROVE);

    const updated = applyCashInResponse(
      attempt,
      call(200, { operation_id: 'op_1', status: 'completed', amount: 100, new_balance: 350 }),
    );

    expect(updated.status).toBe(AttemptStatus.COMPLETED);
    expect(updated.newBalance).toBe(350);
  });

  it('un 503 no borra el estado de una operación que ya existía', () => {
    const pending = applyCashInResponse(
      createAttempt(100, PaymentMethod.TIMEOUT),
      call(202, { operation_id: 'op_1', status: 'pending', amount: 100 }),
    );

    const updated = applyCashInResponse(
      pending,
      call(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'BD caída' } }),
    );

    expect(updated.status).toBe(AttemptStatus.PENDING);
    expect(updated.errorMessage).toContain('SERVICE_UNAVAILABLE');
  });

  it('sin conexión y sin operación previa queda en error', () => {
    const updated = applyCashInResponse(createAttempt(100, PaymentMethod.APPROVE), {
      ...call(0, null),
      networkError: 'Failed to fetch',
    });

    expect(updated.status).toBe(AttemptStatus.ERROR);
    expect(updated.errorMessage).toBe('Failed to fetch');
  });
});

describe('balanceFromAttempts', () => {
  it('el saldo es el mayor new_balance visto (los abonos solo suman)', () => {
    const attempts = [
      { ...createAttempt(1, PaymentMethod.APPROVE), newBalance: 101 },
      { ...createAttempt(1, PaymentMethod.APPROVE), newBalance: 102 },
      createAttempt(1, PaymentMethod.DECLINE),
    ];

    expect(balanceFromAttempts(attempts)).toBe(102);
  });
});
