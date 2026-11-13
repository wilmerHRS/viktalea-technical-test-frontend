import type { useScenarioRunner } from '../../hooks/use-scenario-runner.hook.ts';
import { RunStatus } from '../../hooks/use-scenario-runner.hook.ts';
import { SCENARIOS } from '../../scenarios/scenarios.registry.ts';
import { ScenarioKind } from '../../types/scenario.types.ts';
import { ScenarioCard } from './scenario-card.component.tsx';

interface ScenarioPanelProps {
  runner: ReturnType<typeof useScenarioRunner>;
}

const AUTOMATIC_SCENARIOS = SCENARIOS.filter(
  (scenario) => scenario.kind === ScenarioKind.AUTOMATIC,
);
const PERCENT = 100;

/** Los escenarios del documento, cada uno verificado contra el backend real. */
export const ScenarioPanel = ({ runner }: ScenarioPanelProps) => {
  const runAllAutomatic = async () => {
    for (const scenario of AUTOMATIC_SCENARIOS) {
      await runner.run(scenario);
    }
  };
  const passed = SCENARIOS.filter(
    (scenario) => runner.runOf(scenario.id).status === RunStatus.PASSED,
  );
  const isAnyRunning = SCENARIOS.some(
    (scenario) => runner.runOf(scenario.id).status === RunStatus.RUNNING,
  );
  const progressPercent = (passed.length / SCENARIOS.length) * PERCENT;

  return (
    <section aria-labelledby="scenarios-title">
      <div className="section-header">
        <div>
          <h2 id="scenarios-title">Escenarios del documento</h2>
          <p className="muted">
            Cada escenario se ejecuta contra el backend real. Los guiados necesitan que detengas la
            BD o un pod.
          </p>
        </div>
        <button
          className="button button--primary"
          disabled={isAnyRunning}
          onClick={() => void runAllAutomatic()}
        >
          ▶ Ejecutar los {AUTOMATIC_SCENARIOS.length} automáticos
        </button>
      </div>

      <div className="score" aria-label={`${passed.length} de ${SCENARIOS.length} cumplen`}>
        <span className="score__value">
          {passed.length}/{SCENARIOS.length}
        </span>
        <span className="score__label">cumplen</span>
        <span className="score__bar" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </span>
      </div>

      <ol className="scenarios">
        {SCENARIOS.map((scenario, index) => (
          <ScenarioCard
            key={scenario.id}
            index={index}
            scenario={scenario}
            run={runner.runOf(scenario.id)}
            onRun={() => void runner.run(scenario)}
          />
        ))}
      </ol>
    </section>
  );
};
