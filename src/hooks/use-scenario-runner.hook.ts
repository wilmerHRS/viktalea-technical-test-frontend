import { useCallback, useState } from 'react';
import { postCashIn } from '../api/clients/cash-in.client.ts';
import { postPaymentWebhook } from '../api/clients/payment-webhook.client.ts';
import { appConfig } from '../config/app.config.ts';
import type { ApiCall } from '../types/api-call.types.ts';
import type { Scenario, ScenarioContext, ScenarioOutcome } from '../types/scenario.types.ts';

export const RunStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export interface ScenarioRun {
  status: RunStatus;
  progress: string | null;
  outcome: ScenarioOutcome | null;
  error: string | null;
  durationMs: number | null;
}

const IDLE_RUN: ScenarioRun = {
  status: RunStatus.IDLE,
  progress: null,
  outcome: null,
  error: null,
  durationMs: null,
};

interface UseScenarioRunnerOptions {
  onCall: (call: ApiCall) => void;
}

/** Ejecuta escenarios contra el backend real y guarda su progreso y resultado. */
export const useScenarioRunner = ({ onCall }: UseScenarioRunnerOptions) => {
  const [runs, setRuns] = useState<Record<string, ScenarioRun>>({});

  const update = useCallback((id: string, patch: Partial<ScenarioRun>) => {
    setRuns((previous) => ({ ...previous, [id]: { ...(previous[id] ?? IDLE_RUN), ...patch } }));
  }, []);

  const buildContext = useCallback(
    (scenario: Scenario): ScenarioContext => {
      const pods = appConfig.apiUrls;
      const podAt = (index: number): string => pods[index % pods.length] ?? '';
      return {
        pods,
        cashIn: async (podIndex, idempotencyKey, body) => {
          const call = await postCashIn(scenario.title, podAt(podIndex), idempotencyKey, body);
          onCall(call);
          return call;
        },
        webhook: async (podIndex, payload, options) => {
          const secret = options?.secret ?? appConfig.webhookSecret;
          const call = await postPaymentWebhook(scenario.title, podAt(podIndex), payload, secret);
          onCall(call);
          return call;
        },
        newUserId: () => `usr_scn_${crypto.randomUUID().slice(0, 8)}`,
        newIdempotencyKey: () => crypto.randomUUID(),
        progress: (message) => update(scenario.id, { progress: message }),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      };
    },
    [onCall, update],
  );

  const run = useCallback(
    async (scenario: Scenario) => {
      const startedAt = Date.now();
      update(scenario.id, { ...IDLE_RUN, status: RunStatus.RUNNING, progress: 'Iniciando…' });
      try {
        const outcome = await scenario.run(buildContext(scenario));
        const passed = outcome.checks.every((scenarioCheck) => scenarioCheck.passed);
        update(scenario.id, {
          status: passed ? RunStatus.PASSED : RunStatus.FAILED,
          progress: null,
          outcome,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        update(scenario.id, {
          status: RunStatus.FAILED,
          progress: null,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        });
      }
    },
    [buildContext, update],
  );

  const runOf = (scenarioId: string): ScenarioRun => runs[scenarioId] ?? IDLE_RUN;

  return { run, runOf };
};
