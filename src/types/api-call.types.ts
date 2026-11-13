/** Una llamada HTTP real al backend, tal como se muestra en el registro. */
export interface ApiCall<TBody = unknown> {
  id: string;
  /** Escenario u origen que la hizo (p. ej. "Cuenta" o "Doble click"). */
  source: string;
  method: 'POST';
  /** Pod (URL base) al que se envió. */
  pod: string;
  path: string;
  idempotencyKey?: string;
  requestBody: unknown;
  /** 0 si no hubo respuesta (servidor caído o error de red). */
  status: number;
  responseBody: TBody | null;
  retryAfterSeconds: number | null;
  durationMs: number;
  startedAt: number;
  /** Mensaje si la request no llegó al servidor. */
  networkError?: string;
}
