import type { ApiErrorBody } from '../../types/cash-in.types.ts';
import { ScenarioKind, type Scenario } from '../../types/scenario.types.ts';
import { cashInBody, check } from '../utils/scenario.util.ts';

const SERVICE_UNAVAILABLE = 503;

export const databaseFailureScenario: Scenario = {
  id: 'database-failure',
  title: 'Fallo temporal de DB',
  expected:
    'Si la base de datos cae, la API no debe responder un error genérico ni caerse: debe indicar que se reintente, y reintentar debe ser seguro.',
  mechanism:
    'Los errores de conexión se traducen a 503 SERVICE_UNAVAILABLE con Retry-After. El pool descarta las conexiones caídas sin tumbar el proceso. Reintentar con la misma key es seguro.',
  kind: ScenarioKind.GUIDED,
  instructions: [
    'En la carpeta del backend, detén la base de datos: npm run db:down',
    'Pulsa "Ejecutar" (se espera un 503).',
    'Vuelve a levantarla: npm run db:up — y haz una recarga normal desde la cuenta.',
  ],
  async run(context) {
    const userId = context.newUserId();
    context.progress('Recargando con la base de datos detenida…');
    const call = await context.cashIn(0, context.newIdempotencyKey(), cashInBody(userId));
    const errorBody = call.responseBody as ApiErrorBody | null;

    return {
      summary:
        call.status === SERVICE_UNAVAILABLE
          ? '503 SERVICE_UNAVAILABLE: correcto'
          : `HTTP ${call.status}: ¿detuviste la BD con npm run db:down?`,
      checks: [
        check('El backend sigue respondiendo (no se cayó)', call.status !== 0, call.networkError),
        check(
          'Responde 503 SERVICE_UNAVAILABLE (no 500)',
          call.status === SERVICE_UNAVAILABLE && errorBody?.error.code === 'SERVICE_UNAVAILABLE',
          `HTTP ${call.status} ${errorBody?.error.code ?? ''}`,
        ),
        check('Indica cuándo reintentar (Retry-After)', call.retryAfterSeconds !== null),
      ],
    };
  },
};
