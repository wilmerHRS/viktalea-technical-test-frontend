const HEALTH_PATH = '/health';
const HEALTH_TIMEOUT_MS = 2000;

/** true si el pod responde a GET /health. */
export const isPodHealthy = async (pod: string): Promise<boolean> => {
  try {
    const response = await fetch(`${pod}${HEALTH_PATH}`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
};
