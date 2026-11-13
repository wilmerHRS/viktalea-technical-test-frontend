import { useEffect, useState } from 'react';

const CLOCK_REFRESH_MS = 30_000;
const clockFormatter = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });

interface PhoneFrameProps {
  children: React.ReactNode;
}

/** Marco de teléfono: muestra la cuenta como la vería el usuario en la app. */
export const PhoneFrame = ({ children }: PhoneFrameProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="phone" aria-label="App del usuario">
      <div className="phone__screen">
        <div className="phone__status-bar" aria-hidden="true">
          <span>{clockFormatter.format(now)}</span>
          <span className="phone__notch" />
          <span className="phone__signal">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="phone__content">{children}</div>
        <div className="phone__home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
};
