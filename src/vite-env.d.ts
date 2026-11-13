/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URLS?: string;
  readonly VITE_WEBHOOK_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
