import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { postCashIn } from '../api/clients/cash-in.client.ts';
import { postPaymentWebhook } from '../api/clients/payment-webhook.client.ts';
import { appConfig } from '../config/app.config.ts';
import { CURRENCY, type PaymentMethod } from '../constants/payment-methods.constants.ts';
import type { ApiCall } from '../types/api-call.types.ts';
import {
  AttemptStatus,
  FINAL_ATTEMPT_STATUSES,
  type RechargeAttempt,
} from '../types/wallet.types.ts';
import {
  applyCashInResponse,
  balanceFromAttempts,
  createAttempt,
} from '../utils/recharge-attempt.util.ts';

const LOG_SOURCE = 'Cuenta';
const DEFAULT_RETRY_AFTER_SECONDS = 2;
const MAX_AUTO_RETRIES = 60;
const MS_PER_SECOND = 1000;
/** Tras un resultado final, un click idéntico dentro de esta ventana se considera doble click. */
const DOUBLE_CLICK_WINDOW_MS = 1500;

const newUserId = (): string => `usr_demo_${crypto.randomUUID().slice(0, 8)}`;

interface UseWalletOptions {
  onCall: (call: ApiCall) => void;
}

/**
 * Simula la app del usuario: su saldo, sus recargas y el comportamiento real de un cliente.
 * Un intento de recarga conserva su Idempotency-Key hasta tener un resultado final, así que
 * un doble click o un reintento envían la MISMA key (y el backend no cobra dos veces).
 */
export const useWallet = ({ onCall }: UseWalletOptions) => {
  const [userId, setUserId] = useState(newUserId);
  const [attempts, setAttempts] = useState<RechargeAttempt[]>([]);
  const [autoRetry, setAutoRetry] = useState(true);
  const [podIndex, setPodIndex] = useState(0);
  /**
   * Intento "en curso": se reutiliza su key mientras no tenga un resultado final. Es una ref (y no
   * estado) porque el segundo click de un doble click llega antes de que React vuelva a renderizar.
   */
  const currentAttempt = useRef<RechargeAttempt | null>(null);
  const latestAttempts = useRef<RechargeAttempt[]>([]);
  useEffect(() => {
    latestAttempts.current = attempts;
  }, [attempts]);
  const autoRetryTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const pod = appConfig.apiUrls[podIndex] ?? appConfig.apiUrls[0] ?? '';

  const updateAttempt = useCallback(
    (key: string, update: (attempt: RechargeAttempt) => RechargeAttempt) => {
      setAttempts((previous) =>
        previous.map((attempt) => (attempt.idempotencyKey === key ? update(attempt) : attempt)),
      );
    },
    [],
  );

  const send = useCallback(
    async (attempt: RechargeAttempt): Promise<void> => {
      updateAttempt(attempt.idempotencyKey, (current) => ({
        ...current,
        requestsSent: current.requestsSent + 1,
      }));
      const call = await postCashIn(LOG_SOURCE, pod, attempt.idempotencyKey, {
        user_id: userId,
        amount: attempt.amount,
        currency: CURRENCY,
        payment_method: attempt.paymentMethod,
      });
      onCall(call);
      updateAttempt(attempt.idempotencyKey, (current) => applyCashInResponse(current, call));
    },
    [onCall, pod, updateAttempt, userId],
  );

  /** Botón "Recargar": reutiliza la key del intento en curso si es la misma recarga. */
  const recharge = useCallback(
    (amount: number, paymentMethod: PaymentMethod) => {
      const inProgress = currentAttempt.current;
      // El estado más reciente del intento (si ya se renderizó); si no, el recién creado.
      const current =
        latestAttempts.current.find(
          (attempt) => attempt.idempotencyKey === inProgress?.idempotencyKey,
        ) ?? inProgress;
      const hasSameData =
        current !== null && current.amount === amount && current.paymentMethod === paymentMethod;
      const isStillOpen = current !== null && !FINAL_ATTEMPT_STATUSES.includes(current.status);
      // Si el backend respondió antes del segundo click, el intento ya es final; dentro de esta
      // ventana se trata igual como el mismo intento (el backend devuelve el resultado guardado).
      const isWithinDoubleClickWindow =
        current !== null && Date.now() - current.createdAt < DOUBLE_CLICK_WINDOW_MS;
      const isSameRecharge = hasSameData && (isStillOpen || isWithinDoubleClickWindow);

      if (isSameRecharge) {
        void send(current);
        return;
      }
      const attempt = createAttempt(amount, paymentMethod);
      currentAttempt.current = attempt;
      setAttempts((previous) => [attempt, ...previous]);
      void send(attempt);
    },
    [send],
  );

  const retry = useCallback(
    (key: string) => {
      const attempt = attempts.find((candidate) => candidate.idempotencyKey === key);
      if (attempt) {
        void send(attempt);
      }
    },
    [attempts, send],
  );

  /** Simula a la pasarela notificando el resultado de una operación. */
  const sendWebhook = useCallback(
    async (
      key: string,
      status: 'approved' | 'declined',
      eventId = `evt_${crypto.randomUUID()}`,
    ) => {
      const attempt = attempts.find((candidate) => candidate.idempotencyKey === key);
      if (!attempt?.operationId) {
        return null;
      }
      const call = await postPaymentWebhook(
        'Pasarela simulada',
        pod,
        {
          event_id: eventId,
          operation_id: attempt.operationId,
          status,
          ...(status === 'approved' ? { provider_charge_id: `ch_${eventId}` } : {}),
        },
        appConfig.webhookSecret,
      );
      onCall(call);
      return eventId;
    },
    [attempts, onCall, pod],
  );

  // Retry automático de la app: ante un 202 / 503 / sin conexión, reintenta con la MISMA key
  // tras el Retry-After que pidió el servidor.
  useEffect(() => {
    const timers = autoRetryTimers.current;
    for (const attempt of attempts) {
      const needsRetry =
        autoRetry &&
        (attempt.status === AttemptStatus.PENDING ||
          (attempt.status === AttemptStatus.ERROR && attempt.lastHttpStatus !== 400)) &&
        attempt.requestsSent < MAX_AUTO_RETRIES &&
        !timers.has(attempt.idempotencyKey);
      if (needsRetry) {
        const delaySeconds = attempt.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
        const timer = setTimeout(() => {
          timers.delete(attempt.idempotencyKey);
          void send(attempt);
        }, delaySeconds * MS_PER_SECOND);
        timers.set(attempt.idempotencyKey, timer);
      }
    }
  }, [attempts, autoRetry, send]);

  useEffect(() => {
    const timers = autoRetryTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const switchUser = useCallback(() => {
    for (const timer of autoRetryTimers.current.values()) {
      clearTimeout(timer);
    }
    autoRetryTimers.current.clear();
    currentAttempt.current = null;
    setAttempts([]);
    setUserId(newUserId());
  }, []);

  const balance = useMemo(() => balanceFromAttempts(attempts), [attempts]);

  return {
    userId,
    balance,
    attempts,
    autoRetry,
    setAutoRetry,
    podIndex,
    setPodIndex,
    recharge,
    retry,
    sendWebhook,
    switchUser,
  };
};
