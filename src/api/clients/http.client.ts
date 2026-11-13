import type { ApiCall } from '../../types/api-call.types.ts';

export interface HttpPostRequest {
  source: string;
  pod: string;
  path: string;
  headers: Record<string, string>;
  /** Texto exacto del body: la firma de los webhooks se calcula sobre estos bytes. */
  rawBody: string;
  idempotencyKey?: string;
}

const RETRY_AFTER_HEADER = 'Retry-After';

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * POST que nunca lanza: si el servidor no responde (caído, reiniciando) devuelve status 0 con
 * el error. Así los escenarios pueden comprobar también lo que pasa cuando algo falla.
 */
export const postJson = async <TBody>(request: HttpPostRequest): Promise<ApiCall<TBody>> => {
  const startedAt = Date.now();
  const base = {
    id: crypto.randomUUID(),
    source: request.source,
    method: 'POST' as const,
    pod: request.pod,
    path: request.path,
    idempotencyKey: request.idempotencyKey,
    requestBody: JSON.parse(request.rawBody) as unknown,
    startedAt,
  };
  try {
    const response = await fetch(`${request.pod}${request.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...request.headers },
      body: request.rawBody,
    });
    const retryAfter = response.headers.get(RETRY_AFTER_HEADER);
    return {
      ...base,
      status: response.status,
      responseBody: (await parseJson(response)) as TBody,
      retryAfterSeconds: retryAfter === null ? null : Number(retryAfter),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ...base,
      status: 0,
      responseBody: null,
      retryAfterSeconds: null,
      durationMs: Date.now() - startedAt,
      networkError: error instanceof Error ? error.message : String(error),
    };
  }
};
