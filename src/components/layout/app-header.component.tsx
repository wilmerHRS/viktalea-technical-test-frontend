import { appConfig } from '../../config/app.config.ts';
import { usePodHealth } from '../../hooks/use-pod-health.hook.ts';
import { podLabel } from '../../utils/format.util.ts';
import { podHealthBadge } from '../common/status-badge.component.tsx';

export const AppHeader = () => {
  const health = usePodHealth(appConfig.apiUrls);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__logo" aria-hidden="true">
          W
        </span>
        <div>
          <h1>Wallet Cash-In</h1>
          <p>Simulador de la cuenta y de los escenarios del challenge</p>
        </div>
      </div>
      <div className="pods" aria-label="Estado de los pods del backend">
        {appConfig.apiUrls.map((pod, index) => {
          const { tone, label } = podHealthBadge(health[pod]);
          return (
            <div key={pod} className="pod" title={pod}>
              <span className={`pod__dot pod__dot--${tone}`} aria-hidden="true" />
              <span className="pod__name">Pod {String.fromCharCode(65 + index)}</span>
              <span className="pod__url">{podLabel(pod)}</span>
              <span className="pod__state">{label}</span>
            </div>
          );
        })}
      </div>
    </header>
  );
};
