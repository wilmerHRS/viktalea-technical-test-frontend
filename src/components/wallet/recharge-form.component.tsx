import { useState } from 'react';
import { appConfig } from '../../config/app.config.ts';
import {
  PAYMENT_METHOD_OPTIONS,
  PaymentMethod,
} from '../../constants/payment-methods.constants.ts';

const DEFAULT_AMOUNT = 100;
/** Montos rápidos, como en una app de billetera. */
const QUICK_AMOUNTS = [50, 100, 200];

interface RechargeFormProps {
  podIndex: number;
  onPodChange: (index: number) => void;
  autoRetry: boolean;
  onAutoRetryChange: (enabled: boolean) => void;
  onRecharge: (amount: number, paymentMethod: PaymentMethod) => void;
}

/**
 * Formulario de recarga. El botón NO se deshabilita a propósito: así un doble click llega dos
 * veces al backend con la misma Idempotency-Key y se ve que no cobra dos veces.
 */
export const RechargeForm = ({
  podIndex,
  onPodChange,
  autoRetry,
  onAutoRetryChange,
  onRecharge,
}: RechargeFormProps) => {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.APPROVE);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onRecharge(amount, paymentMethod);
  };

  return (
    <form className="recharge-card" onSubmit={submit}>
      <h3>Recargar saldo</h3>

      <label className="field">
        <span className="field__label">Monto</span>
        <span className="amount-input">
          <span aria-hidden="true">S/</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-label="Monto en soles"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </span>
      </label>
      <div className="chips" role="group" aria-label="Montos rápidos">
        {QUICK_AMOUNTS.map((quickAmount) => (
          <button
            key={quickAmount}
            type="button"
            className={quickAmount === amount ? 'chip chip--active' : 'chip'}
            onClick={() => setAmount(quickAmount)}
          >
            S/ {quickAmount}
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field__label">Tarjeta (pasarela simulada)</span>
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
        >
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span className="field__label">Enviar al</span>
        <div className="segmented" role="radiogroup" aria-label="Pod destino">
          {appConfig.apiUrls.map((pod, index) => (
            <button
              key={pod}
              type="button"
              role="radio"
              aria-checked={index === podIndex}
              title={pod}
              className={index === podIndex ? 'segmented__option is-active' : 'segmented__option'}
              onClick={() => onPodChange(index)}
            >
              Pod {String.fromCharCode(65 + index)}
            </button>
          ))}
        </div>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={autoRetry}
          onChange={(event) => onAutoRetryChange(event.target.checked)}
        />
        <span className="switch__track" aria-hidden="true" />
        <span>
          Retry automático
          <small>Como la app real, respetando Retry-After</small>
        </span>
      </label>

      <button type="submit" className="button button--primary button--block">
        Recargar
      </button>
      <p className="hint">Prueba un doble click: se reutiliza la misma Idempotency-Key.</p>
    </form>
  );
};
