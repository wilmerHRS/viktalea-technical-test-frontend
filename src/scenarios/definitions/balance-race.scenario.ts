import { PaymentMethod } from '../../constants/payment-methods.constants.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check } from '../utils/scenario.util.ts';

const PARALLEL_RECHARGES = 20;

export const balanceRaceScenario: Scenario = {
  id: 'balance-race',
  title: 'Race condition sobre el saldo',
  expected:
    'Muchas recargas DISTINTAS del mismo usuario a la vez: ninguna se pierde y el saldo final es la suma exacta.',
  mechanism:
    'El saldo se incrementa dentro de la base (balance = balance + x), nunca "leer, sumar en JS y escribir". Cada abono queda en el ledger con el saldo resultante.',
  kind: ScenarioKind.AUTOMATIC,
  async run(context) {
    const userId = context.newUserId();
    const amounts = Array.from({ length: PARALLEL_RECHARGES }, (_, index) => index + 1);
    const expectedBalance = amounts.reduce((sum, amount) => sum + amount, 0);

    context.progress(`${PARALLEL_RECHARGES} recargas distintas a la vez…`);
    const calls = await Promise.all(
      amounts.map((amount, index) =>
        context.cashIn(
          index % context.pods.length,
          context.newIdempotencyKey(),
          cashInBody(userId, PaymentMethod.APPROVE, amount),
        ),
      ),
    );
    const balances = calls.map((call) => call.responseBody?.new_balance ?? 0);
    const finalBalance = Math.max(...balances);
    const distinctBalances = new Set(balances).size;

    return {
      summary: `saldo final ${finalBalance} (esperado ${expectedBalance})`,
      checks: [
        check(
          'Todas las recargas se completan (200)',
          calls.every((call) => call.status === 200),
        ),
        check(
          `El saldo final es la suma exacta (${expectedBalance})`,
          finalBalance === expectedBalance,
          `saldo ${finalBalance}`,
        ),
        check(
          'Cada abono vio un saldo distinto (ninguno se pisó)',
          distinctBalances === PARALLEL_RECHARGES,
          `${distinctBalances} saldos distintos`,
        ),
      ],
    };
  },
};
