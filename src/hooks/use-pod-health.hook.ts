import { useEffect, useState } from 'react';
import { isPodHealthy } from '../api/clients/health.client.ts';

const HEALTH_POLL_MS = 3000;

/** Estado de cada pod del backend (se consulta cada pocos segundos). */
export const usePodHealth = (pods: string[]): Record<string, boolean | null> => {
  const [health, setHealth] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const results = await Promise.all(pods.map(async (pod) => [pod, await isPodHealthy(pod)]));
      if (!cancelled) {
        setHealth(Object.fromEntries(results));
      }
    };
    void check();
    const timer = setInterval(() => void check(), HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pods]);

  return health;
};
