import { describe, expect, it } from 'vitest';
import { doubleClickScenario } from '../scenarios/definitions/double-click.scenario.ts';
import type { ApiCall } from '../types/api-call.types.ts';
import type { CashInResponseBody } from '../types/cash-in.types.ts';
import type { ScenarioContext } from '../types/scenario.types.ts';

const response = (operationId: string, newBalance: number) =>
  ({
    status: 200,
    responseBody: {
      operation_id: operationId,
      status: 'completed',
      amount: 100,
      new_balance: newBalance,
    },
    retryAfterSeconds: null,
  }) as ApiCall<CashInResponseBody>;

const contextReturning = (responses: ApiCall<CashInResponseBody>[]): ScenarioContext => {
  let index = 0;
  return {
    pods: ['http://localhost:3000'],
    cashIn: async () => responses[Math.min(index++, responses.length - 1)]!,
    webhook: async () => ({}) as ApiCall,
    newUserId: () => 'usr_test',
    newIdempotencyKey: () => 'key',
    progress: () => undefined,
    sleep: async () => undefined,
  };
};

describe('escenario "Doble click"', () => {
  it('cumple si ambos clicks devuelven la misma operación y se acredita una vez', async () => {
    const outcome = await doubleClickScenario.run(
      contextReturning([response('op_1', 100), response('op_1', 100), response('op_1', 100)]),
    );

    expect(outcome.checks.every((check) => check.passed)).toBe(true);
  });

  it('NO cumple si el backend crea dos operaciones y acredita dos veces', async () => {
    const outcome = await doubleClickScenario.run(
      contextReturning([response('op_1', 100), response('op_2', 200), response('op_2', 200)]),
    );

    expect(outcome.checks.filter((check) => !check.passed)).toHaveLength(2);
  });
});
