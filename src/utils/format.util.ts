const moneyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const timeFormatter = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const SHORT_ID_LENGTH = 8;

export const formatMoney = (amount: number): string => moneyFormatter.format(amount);

export const formatTime = (timestamp: number): string => timeFormatter.format(timestamp);

/** "6e06706c-711f-…" → "6e06706c…" (para mostrar keys e ids largos). */
export const shortId = (id: string | null | undefined): string =>
  id ? `${id.slice(0, SHORT_ID_LENGTH)}…` : '—';

/** Quita el `http://` de la URL de un pod para mostrarlo compacto. */
export const podLabel = (pod: string): string => pod.replace(/^https?:\/\//, '');
