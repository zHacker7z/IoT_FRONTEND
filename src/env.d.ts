/// <reference types="vite/client" />

/** Variáveis públicas lidas pelo Vite. Nunca coloque segredos aqui: elas vão para o navegador. */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_LATEST_PATH?: string
  readonly VITE_API_HISTORY_PATH?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_REFRESH_INTERVAL_SECONDS?: string
  readonly VITE_STALE_AFTER_MINUTES?: string
  readonly VITE_API_FIELD_TEMPERATURE?: string
  readonly VITE_API_FIELD_HUMIDITY?: string
  readonly VITE_API_FIELD_TIMESTAMP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
