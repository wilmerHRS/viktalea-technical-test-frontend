import {
  AttemptStatus,
  WebhookOutcome,
  WebhookStatus,
  type RechargeAttempt,
} from '../../types/wallet.types.ts';
import { formatMoney, formatTime, shortId } from '../../utils/format.util.ts';
import { StatusBadge, type BadgeTone } from '../common/status-badge.component.tsx';

interface BadgeView {
  tone: BadgeTone;
  label: string;
}

interface StatusView extends BadgeView {
  icon: string;
}

const STATUS_VIEW: Record<AttemptStatus, StatusView> = {
  [AttemptStatus.SENDING]: { tone: 'neutral', label: 'enviando', icon: '…' },
  [AttemptStatus.PENDING]: { tone: 'info', label: 'pendiente', icon: '⏳' },
  [AttemptStatus.COMPLETED]: { tone: 'success', label: 'completada', icon: '↓' },
  [AttemptStatus.FAILED]: { tone: 'danger', label: 'rechazada', icon: '✕' },
  [AttemptStatus.ERROR]: { tone: 'warning', label: 'error', icon: '!' },
};

/** Cómo se muestra lo que hizo el backend con cada webhook. */
const OUTCOME_VIEW: Record<WebhookOutcome, BadgeView> = {
  [WebhookOutcome.APPLIED]: { tone: 'success', label: 'aplicado' },
  [WebhookOutcome.DUPLICATE]: { tone: 'neutral', label: 'duplicado, ignorado' },
  [WebhookOutcome.CONFLICT]: { tone: 'warning', label: 'conflicto, no cambia nada' },
  [WebhookOutcome.IGNORED]: { tone: 'neutral', label: 'ignorado' },
  [WebhookOutcome.ERROR]: { tone: 'danger', label: 'error' },
};

interface AttemptItemProps {
  attempt: RechargeAttempt;
  onRetry: (key: string) => void;
  onWebhook: (key: string, status: WebhookStatus) => void;
  onDuplicateWebhook: (key: string) => void;
}

/** Un movimiento de la cuenta. Al abrirlo muestra el detalle técnico y las acciones de prueba. */
export const AttemptItem = ({
  attempt,
  onRetry,
  onWebhook,
  onDuplicateWebhook,
}: AttemptItemProps) => {
  const view = STATUS_VIEW[attempt.status];
  const hasOperation = attempt.operationId !== null;
  const isWaitingProvider = attempt.status === AttemptStatus.PENDING && hasOperation;
  const sendApproved = () => onWebhook(attempt.idempotencyKey, WebhookStatus.APPROVED);
  const sendDeclined = () => onWebhook(attempt.idempotencyKey, WebhookStatus.DECLINED);

  return (
    <li className="attempt">
      <details>
        <summary className="attempt__summary">
          <span className={`attempt__icon attempt__icon--${view.tone}`} aria-hidden="true">
            {view.icon}
          </span>
          <span className="attempt__title">
            <strong>Recarga</strong>
            <span className="muted">
              {formatTime(attempt.createdAt)} · {attempt.requestsSent} request(s)
            </span>
          </span>
          <span className="attempt__amount">
            <strong>+{formatMoney(attempt.amount)}</strong>
            <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
          </span>
        </summary>

        <dl className="attempt__meta">
          <dt>Idempotency-Key</dt>
          <dd title={attempt.idempotencyKey}>{shortId(attempt.idempotencyKey)}</dd>
          <dt>Operación</dt>
          <dd title={attempt.operationId ?? ''}>{shortId(attempt.operationId)}</dd>
          <dt>Último HTTP</dt>
          <dd>{attempt.lastHttpStatus ?? '—'}</dd>
          <dt>Pasarela</dt>
          <dd>{attempt.paymentMethod}</dd>
          {attempt.newBalance !== null && (
            <>
              <dt>Saldo tras abonar</dt>
              <dd>{formatMoney(attempt.newBalance)}</dd>
            </>
          )}
          {attempt.failureReason && (
            <>
              <dt>Motivo</dt>
              <dd>{attempt.failureReason}</dd>
            </>
          )}
          {attempt.errorMessage && (
            <>
              <dt>Error</dt>
              <dd className="text-danger">{attempt.errorMessage}</dd>
            </>
          )}
        </dl>

        <div className="attempt__actions">
          <button className="button button--small" onClick={() => onRetry(attempt.idempotencyKey)}>
            Reintentar (misma key)
          </button>
          <span className="attempt__provider">Simular la pasarela (POST /webhooks/payment)</span>
          <div className="attempt__webhooks">
            <button
              className="button button--small"
              disabled={!hasOperation}
              onClick={sendApproved}
            >
              approved
            </button>
            <button
              className="button button--small"
              disabled={!hasOperation}
              onClick={sendDeclined}
            >
              declined
            </button>
            <button
              className="button button--small"
              disabled={!hasOperation}
              onClick={() => onDuplicateWebhook(attempt.idempotencyKey)}
            >
              duplicado ×2
            </button>
          </div>
        </div>
      </details>

      {isWaitingProvider && (
        <div className="provider-callout">
          <p>
            <strong>Esperando a la pasarela.</strong> Simula su webhook:
          </p>
          <div className="attempt__webhooks">
            <button className="button button--small button--success" onClick={sendApproved}>
              ✓ approved
            </button>
            <button className="button button--small button--danger" onClick={sendDeclined}>
              ✕ declined
            </button>
          </div>
        </div>
      )}

      {attempt.webhooks.length > 0 && (
        <ul className="webhook-notices" aria-label="Webhooks recibidos por el backend">
          {attempt.webhooks.map((notice, index) => {
            const outcome = OUTCOME_VIEW[notice.outcome];
            return (
              <li key={index}>
                <span className="muted">Webhook {notice.status} →</span>
                <StatusBadge tone={outcome.tone}>
                  {outcome.label}
                  {notice.outcome === WebhookOutcome.ERROR && ` (HTTP ${notice.httpStatus})`}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};
