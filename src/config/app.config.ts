const DEFAULT_API_URLS = 'http://localhost:3000';
const DEFAULT_WEBHOOK_SECRET = 'local_webhook_secret_change_me';

const parseUrls = (value: string): string[] =>
  value
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter((url) => url.length > 0);

/** Configuración leída de `.env` (ver `.env.example`). */
export const appConfig = {
  /** URLs de los pods del backend. El primero es el pod principal. */
  apiUrls: parseUrls(import.meta.env.VITE_API_URLS ?? DEFAULT_API_URLS),
  /** Secreto con el que la pasarela simulada firma los webhooks (solo para desarrollo). */
  webhookSecret: import.meta.env.VITE_WEBHOOK_SECRET ?? DEFAULT_WEBHOOK_SECRET,
};
