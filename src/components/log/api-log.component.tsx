import type { ApiCall } from '../../types/api-call.types.ts';
import { formatTime, podLabel, shortId } from '../../utils/format.util.ts';
import { StatusBadge, toneForHttpStatus } from '../common/status-badge.component.tsx';

const NO_RESPONSE_LABEL = 'sin respuesta';

interface ApiLogProps {
  calls: ApiCall[];
  onClear: () => void;
}

/** Todas las llamadas HTTP reales al backend: lo que se envió y lo que respondió. */
export const ApiLog = ({ calls, onClear }: ApiLogProps) => (
  <section aria-labelledby="log-title">
    <div className="section-header">
      <div>
        <h2 id="log-title">Registro de llamadas al backend</h2>
        <p className="muted">
          Las requests reales, de la app y de los escenarios. Ábrelas para ver el detalle.
        </p>
      </div>
      <button className="button" onClick={onClear} disabled={calls.length === 0}>
        Limpiar
      </button>
    </div>
    {calls.length === 0 ? (
      <p className="empty">Todavía no hay llamadas.</p>
    ) : (
      <ul className="log">
        {calls.map((call) => (
          <li key={call.id}>
            <details>
              <summary className="log__row">
                <StatusBadge tone={toneForHttpStatus(call.status)}>
                  {call.status === 0 ? NO_RESPONSE_LABEL : call.status}
                </StatusBadge>
                <code className="log__path">
                  {call.method} {call.path}
                </code>
                <span className="log__source">{call.source}</span>
                <span className="log__meta">
                  {podLabel(call.pod)}
                  {call.idempotencyKey && (
                    <span title={call.idempotencyKey}> · key {shortId(call.idempotencyKey)}</span>
                  )}
                  {' · '}
                  {call.durationMs} ms · {formatTime(call.startedAt)}
                </span>
              </summary>
              <div className="log__detail">
                <div>
                  <h4>Request</h4>
                  <pre>{JSON.stringify(call.requestBody, null, 2)}</pre>
                </div>
                <div>
                  <h4>Respuesta</h4>
                  <pre>
                    {call.networkError ?? JSON.stringify(call.responseBody, null, 2)}
                    {call.retryAfterSeconds !== null &&
                      `\n\nRetry-After: ${call.retryAfterSeconds}`}
                  </pre>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    )}
  </section>
);
