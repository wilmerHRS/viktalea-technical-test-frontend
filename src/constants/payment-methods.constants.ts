/**
 * `payment_method` que entiende la pasarela SIMULADA del backend. Cada uno fuerza un resultado
 * distinto para poder reproducir los escenarios del challenge.
 */
export const PaymentMethod = {
  APPROVE: 'card_xyz',
  DECLINE: 'card_declined',
  TIMEOUT: 'card_timeout',
  TIMEOUT_AFTER_CHARGE: 'card_timeout_after_charge',
  SLOW: 'card_slow',
  UNAVAILABLE: 'card_unavailable',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.APPROVE, label: 'Aprueba' },
  { value: PaymentMethod.DECLINE, label: 'Rechaza' },
  { value: PaymentMethod.SLOW, label: 'Aprueba lento (3 s)' },
  { value: PaymentMethod.TIMEOUT_AFTER_CHARGE, label: 'Cobra pero no responde (pregunta central)' },
  { value: PaymentMethod.TIMEOUT, label: 'No cobra y no responde' },
  { value: PaymentMethod.UNAVAILABLE, label: 'Error de red' },
];

export const CURRENCY = 'PEN';
