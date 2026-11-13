import type { Scenario } from '../types/scenario.types.ts';
import { appRetryScenario } from './definitions/app-retry.scenario.ts';
import { balanceRaceScenario } from './definitions/balance-race.scenario.ts';
import { contractValidationScenario } from './definitions/contract-validation.scenario.ts';
import { databaseFailureScenario } from './definitions/database-failure.scenario.ts';
import { doubleClickScenario } from './definitions/double-click.scenario.ts';
import { duplicateWebhookScenario } from './definitions/duplicate-webhook.scenario.ts';
import { multiPodScenario } from './definitions/multi-pod.scenario.ts';
import { outOfOrderWebhookScenario } from './definitions/out-of-order-webhook.scenario.ts';
import { providerTimeoutScenario } from './definitions/provider-timeout.scenario.ts';
import { serviceRestartScenario } from './definitions/service-restart.scenario.ts';
import { webhookBeforeResponseScenario } from './definitions/webhook-before-response.scenario.ts';

/** Los 10 escenarios que el documento exige contemplar, más las validaciones del contrato. */
export const SCENARIOS: readonly Scenario[] = [
  doubleClickScenario,
  appRetryScenario,
  multiPodScenario,
  providerTimeoutScenario,
  duplicateWebhookScenario,
  outOfOrderWebhookScenario,
  webhookBeforeResponseScenario,
  databaseFailureScenario,
  serviceRestartScenario,
  balanceRaceScenario,
  contractValidationScenario,
];
