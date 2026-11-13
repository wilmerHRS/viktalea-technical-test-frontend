import type { ApiCall } from './api-call.types.ts';
import type {
  CashInRequestBody,
  CashInResponseBody,
  PaymentWebhookPayload,
} from './cash-in.types.ts';

/** Cómo se ejecuta un escenario. */
export const ScenarioKind = {
  /** Se ejecuta y se verifica solo. */
  AUTOMATIC: 'automatic',
  /** Necesita que la persona haga algo fuera del navegador (parar la BD o el backend). */
  GUIDED: 'guided',
} as const;
export type ScenarioKind = (typeof ScenarioKind)[keyof typeof ScenarioKind];

/** Una comprobación de lo que exige el documento. */
export interface ScenarioCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ScenarioOutcome {
  checks: ScenarioCheck[];
  summary: string;
}

/** Herramientas que recibe cada escenario para hablar con el backend. */
export interface ScenarioContext {
  pods: string[];
  cashIn(
    podIndex: number,
    idempotencyKey: string,
    body: CashInRequestBody,
  ): Promise<ApiCall<CashInResponseBody>>;
  webhook(
    podIndex: number,
    payload: PaymentWebhookPayload,
    options?: { secret?: string },
  ): Promise<ApiCall>;
  newUserId(): string;
  newIdempotencyKey(): string;
  /** Mensaje de progreso visible en la tarjeta del escenario. */
  progress(message: string): void;
  sleep(ms: number): Promise<void>;
}

export interface Scenario {
  id: string;
  title: string;
  /** Qué exige el documento del challenge para este escenario. */
  expected: string;
  /** Cómo lo resuelve el backend. */
  mechanism: string;
  kind: ScenarioKind;
  /** Pasos que debe hacer la persona (solo escenarios guiados). */
  instructions?: string[];
  run(context: ScenarioContext): Promise<ScenarioOutcome>;
}
