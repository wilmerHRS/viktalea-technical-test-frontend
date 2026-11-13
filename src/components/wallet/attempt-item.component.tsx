import { AttemptStatus, type RechargeAttempt } from '../../types/wallet.types.ts';
import { formatMoney, formatTime, shortId } from '../../utils/format.util.ts';
import { StatusBadge, type BadgeTone } from '../common/status-badge.component.tsx';

interface StatusView {
  tone: BadgeTone;
  label: string;
  icon: string;
}

const STATUS_VIEW: Record<AttemptStatus, StatusView> = {
  [AttemptStatus.SENDING]: { tone: 'neutral', label: 'enviando', icon: '…' },
  [AttemptStatus.PENDING]: { tone: 'info', label: 'pendiente', icon: '⏳' },
  [AttemptStatus.COMPLETED]: { tone: 'success', label: 'completada', icon: '↓' },
  [AttemptStatus.FAILED]: { tone: 'danger', label: 'rechazada', icon: '✕' },
  [AttemptStatus.ERROR]: { tone: 'warning', label: 'error', icon: '!' },
};

interface AttemptItemProps {
  attempt: RechargeAttempt;
  onRetry: (key: string) => void;
  onWebhook: (key: string, status: 'approved' | 'declined') => void;
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
          <span className="attempt__provider">Simular la pasarela</span>
          <div className="attempt__webhooks">
            <button
              className="button button--small"
              disabled={!hasOperation}
              onClick={() => onWebhook(attempt.idempotencyKey, 'approved')}
            >
              approved
            </button>
            <button
              className="button button--small"
              disabled={!hasOperation}
              onClick={() => onWebhook(attempt.idempotencyKey, 'declined')}
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
    </li>
  );
};
