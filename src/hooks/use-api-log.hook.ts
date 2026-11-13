import { useCallback, useState } from 'react';
import type { ApiCall } from '../types/api-call.types.ts';

const MAX_LOG_ENTRIES = 300;

/** Registro de todas las llamadas HTTP reales hechas al backend (las más recientes primero). */
export const useApiLog = () => {
  const [calls, setCalls] = useState<ApiCall[]>([]);

  const record = useCallback((call: ApiCall) => {
    setCalls((previous) => [call, ...previous].slice(0, MAX_LOG_ENTRIES));
  }, []);

  const clear = useCallback(() => setCalls([]), []);

  return { calls, record, clear };
};
