export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
}

export const StatusBadge = ({ tone, children }: StatusBadgeProps) => (
  <span className={`badge badge--${tone}`}>{children}</span>
);

/** Color y texto del estado de un pod (null = aún no se sabe). */
export const podHealthBadge = (isUp: boolean | null | undefined) => {
  if (isUp === null || isUp === undefined) {
    return { tone: 'neutral' as const, label: '…' };
  }
  return isUp
    ? { tone: 'success' as const, label: 'en línea' }
    : { tone: 'danger' as const, label: 'caído' };
};

/** Color de un código HTTP en el registro. */
export const toneForHttpStatus = (status: number): BadgeTone => {
  if (status === 0) {
    return 'danger';
  }
  if (status >= 500) {
    return 'danger';
  }
  if (status >= 400) {
    return 'warning';
  }
  if (status === 202) {
    return 'info';
  }
  return 'success';
};
