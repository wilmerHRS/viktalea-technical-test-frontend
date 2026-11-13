import type { useWallet } from '../../hooks/use-wallet.hook.ts';
import { formatMoney, shortId } from '../../utils/format.util.ts';
import { AttemptItem } from './attempt-item.component.tsx';
import { RechargeForm } from './recharge-form.component.tsx';

interface WalletPanelProps {
  wallet: ReturnType<typeof useWallet>;
}

/** La pantalla de la app: saldo, formulario de recarga y movimientos. */
export const WalletPanel = ({ wallet }: WalletPanelProps) => {
  const sendDuplicateWebhook = async (key: string) => {
    const eventId = await wallet.sendWebhook(key, 'approved');
    if (eventId) {
      await wallet.sendWebhook(key, 'approved', eventId);
    }
  };
  const completedCount = wallet.attempts.filter((attempt) => attempt.newBalance !== null).length;

  return (
    <section className="wallet" aria-labelledby="wallet-title">
      <header className="wallet__header">
        <span className="avatar" aria-hidden="true">
          {wallet.userId.slice(0, 2).toUpperCase()}
        </span>
        <div className="wallet__greeting">
          <span className="muted">Hola 👋</span>
          <h2 id="wallet-title" title={wallet.userId}>
            Usuario {shortId(wallet.userId)}
          </h2>
        </div>
        <button className="icon-button" onClick={wallet.switchUser} title="Nuevo usuario">
          <span aria-hidden="true">↻</span>
          <span className="sr-only">Nuevo usuario</span>
        </button>
      </header>

      <div className="balance-card" aria-live="polite">
        <span className="balance-card__label">Saldo disponible</span>
        <span className="balance-card__amount">{formatMoney(wallet.balance)}</span>
        <span className="balance-card__meta">{completedCount} recarga(s) abonada(s) · PEN</span>
      </div>

      <RechargeForm
        podIndex={wallet.podIndex}
        onPodChange={wallet.setPodIndex}
        autoRetry={wallet.autoRetry}
        onAutoRetryChange={wallet.setAutoRetry}
        onRecharge={wallet.recharge}
      />

      <div className="movements">
        <h3>Movimientos</h3>
        {wallet.attempts.length === 0 ? (
          <p className="empty">Aún no hay recargas. Haz la primera arriba.</p>
        ) : (
          <ul className="attempts">
            {wallet.attempts.map((attempt) => (
              <AttemptItem
                key={attempt.idempotencyKey}
                attempt={attempt}
                onRetry={wallet.retry}
                onWebhook={(key, status) => void wallet.sendWebhook(key, status)}
                onDuplicateWebhook={(key) => void sendDuplicateWebhook(key)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
