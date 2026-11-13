import { AppHeader } from './components/layout/app-header.component.tsx';
import { PhoneFrame } from './components/layout/phone-frame.component.tsx';
import { SidePanel } from './components/layout/side-panel.component.tsx';
import { ApiLog } from './components/log/api-log.component.tsx';
import { ScenarioPanel } from './components/scenarios/scenario-panel.component.tsx';
import { WalletPanel } from './components/wallet/wallet-panel.component.tsx';
import { RunStatus, useScenarioRunner } from './hooks/use-scenario-runner.hook.ts';
import { useApiLog } from './hooks/use-api-log.hook.ts';
import { useWallet } from './hooks/use-wallet.hook.ts';
import { SCENARIOS } from './scenarios/scenarios.registry.ts';

/**
 * Teléfono a la izquierda (todo el alto de la ventana); cabecera y panel a la derecha. En pantallas
 * estrechas el CSS los apila: cabecera, teléfono y panel.
 */
export const App = () => {
  const apiLog = useApiLog();
  const wallet = useWallet({ onCall: apiLog.record });
  const runner = useScenarioRunner({ onCall: apiLog.record });
  const passedCount = SCENARIOS.filter(
    (scenario) => runner.runOf(scenario.id).status === RunStatus.PASSED,
  ).length;

  return (
    <main className="app">
      <div className="app__phone">
        <PhoneFrame>
          <WalletPanel wallet={wallet} />
        </PhoneFrame>
      </div>
      <AppHeader />
      <SidePanel
        tabs={[
          {
            id: 'scenarios',
            label: 'Escenarios',
            counter: `${passedCount}/${SCENARIOS.length}`,
            content: <ScenarioPanel runner={runner} />,
          },
          {
            id: 'log',
            label: 'Registro de llamadas',
            counter: String(apiLog.calls.length),
            content: <ApiLog calls={apiLog.calls} onClear={apiLog.clear} />,
          },
        ]}
      />
    </main>
  );
};
