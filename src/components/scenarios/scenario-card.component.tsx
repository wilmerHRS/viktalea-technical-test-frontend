import { RunStatus, type ScenarioRun } from '../../hooks/use-scenario-runner.hook.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { StatusBadge, type BadgeTone } from '../common/status-badge.component.tsx';

const RUN_VIEW: Record<RunStatus, { tone: BadgeTone; label: string }> = {
  [RunStatus.IDLE]: { tone: 'neutral', label: 'sin ejecutar' },
  [RunStatus.RUNNING]: { tone: 'info', label: 'ejecutando…' },
  [RunStatus.PASSED]: { tone: 'success', label: 'cumple' },
  [RunStatus.FAILED]: { tone: 'danger', label: 'no cumple' },
};

const KIND_LABEL: Record<ScenarioKind, string> = {
  [ScenarioKind.AUTOMATIC]: 'automático',
  [ScenarioKind.GUIDED]: 'guiado',
};

const MS_PER_SECOND = 1000;

interface ScenarioCardProps {
  index: number;
  scenario: Scenario;
  run: ScenarioRun;
  onRun: () => void;
}

/** Una fila de escenario: compacta, y al abrirla muestra qué exige, cómo se resuelve y el resultado. */
export const ScenarioCard = ({ index, scenario, run, onRun }: ScenarioCardProps) => {
  const view = RUN_VIEW[run.status];
  const isRunning = run.status === RunStatus.RUNNING;
  const isGuided = scenario.kind === ScenarioKind.GUIDED;

  return (
    <li className={`scenario scenario--${run.status}`}>
      <div className="scenario__row">
        <span className="scenario__number">{index + 1}</span>
        <div className="scenario__heading">
          <h3>{scenario.title}</h3>
          <span className="scenario__tags">
            <span className={isGuided ? 'tag tag--guided' : 'tag'}>
              {KIND_LABEL[scenario.kind]}
            </span>
            <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
          </span>
        </div>
        <button className="button button--small" disabled={isRunning} onClick={onRun}>
          {isRunning ? 'Ejecutando…' : 'Ejecutar'}
        </button>
      </div>

      {run.progress && <p className="scenario__progress">{run.progress}</p>}

      <details className="scenario__details" open={isGuided}>
        <summary>Detalles</summary>
        <p>
          <strong>Qué exige el documento:</strong> {scenario.expected}
        </p>
        <p className="muted">
          <strong>Cómo lo resuelve el backend:</strong> {scenario.mechanism}
        </p>
        {isGuided && scenario.instructions && (
          <div className="scenario__instructions">
            <strong>Necesita una acción tuya:</strong>
            <ol>
              {scenario.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </div>
        )}
      </details>

      {run.outcome && (
        <div className="scenario__result">
          <p className="scenario__summary">
            {run.outcome.summary}
            {run.durationMs !== null && (
              <span className="muted"> · {(run.durationMs / MS_PER_SECOND).toFixed(1)} s</span>
            )}
          </p>
          <ul className="checks">
            {run.outcome.checks.map((scenarioCheck) => (
              <li
                key={scenarioCheck.label}
                className={scenarioCheck.passed ? 'check check--ok' : 'check check--ko'}
              >
                <span aria-hidden="true">{scenarioCheck.passed ? '✔' : '✖'}</span>{' '}
                {scenarioCheck.label}
                {scenarioCheck.detail && <span className="muted"> — {scenarioCheck.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {run.error && <p className="text-danger">Error: {run.error}</p>}
    </li>
  );
};
