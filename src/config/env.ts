import type { FieldOverrides } from '../types/measurement'

export interface AppConfig {
  /** URL-base da API, sem barra final. */
  apiBaseUrl: string | null
  /** Caminho do endpoint que devolve a medição mais recente. */
  latestPath: string | null
  /** Caminho do endpoint que devolve a lista de medições. */
  historyPath: string | null
  timeoutMs: number
  /** 0 desativa a atualização automática. */
  refreshIntervalMs: number
  /** Idade a partir da qual a última leitura é considerada desatualizada. */
  staleAfterMs: number
  fields: FieldOverrides
}

export interface ConfigStatus {
  isConfigured: boolean
  /** Problemas de configuração, em linguagem de desenvolvedor, para o painel de detalhes. */
  issues: string[]
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_REFRESH_SECONDS = 60
const DEFAULT_STALE_MINUTES = 15

function readText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function readNumber(value: string | undefined, fallback: number, allowZero: boolean): number {
  const text = readText(value)
  if (text === null) return fallback
  const parsed = Number(text.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) return fallback
  return parsed
}

function readBaseUrl(value: string | undefined): { url: string | null; invalid: boolean } {
  const text = readText(value)
  if (text === null) return { url: null, invalid: false }
  try {
    const parsed = new URL(text)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { url: null, invalid: true }
    return { url: text.replace(/\/+$/, ''), invalid: false }
  } catch {
    return { url: null, invalid: true }
  }
}

const env = import.meta.env
const baseUrl = readBaseUrl(env.VITE_API_BASE_URL)

export const appConfig: AppConfig = {
  apiBaseUrl: baseUrl.url,
  latestPath: readText(env.VITE_API_LATEST_PATH),
  historyPath: readText(env.VITE_API_HISTORY_PATH),
  timeoutMs: readNumber(env.VITE_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, false),
  refreshIntervalMs: readNumber(env.VITE_REFRESH_INTERVAL_SECONDS, DEFAULT_REFRESH_SECONDS, true) * 1000,
  staleAfterMs: readNumber(env.VITE_STALE_AFTER_MINUTES, DEFAULT_STALE_MINUTES, false) * 60_000,
  fields: {
    temperature: readText(env.VITE_API_FIELD_TEMPERATURE),
    humidity: readText(env.VITE_API_FIELD_HUMIDITY),
    timestamp: readText(env.VITE_API_FIELD_TIMESTAMP),
  },
}

function describeConfig(config: AppConfig): ConfigStatus {
  const issues: string[] = []
  if (baseUrl.invalid) {
    issues.push('VITE_API_BASE_URL não é uma URL http(s) válida.')
  } else if (config.apiBaseUrl === null) {
    issues.push('VITE_API_BASE_URL não foi definida.')
  }
  if (config.latestPath === null && config.historyPath === null) {
    issues.push('Defina VITE_API_LATEST_PATH e/ou VITE_API_HISTORY_PATH com os endpoints reais da API.')
  }
  return { isConfigured: issues.length === 0, issues }
}

export const configStatus: ConfigStatus = describeConfig(appConfig)

/** Página em HTTPS chamando API em HTTP: o navegador bloqueia (conteúdo misto). */
export function isMixedContent(config: AppConfig = appConfig): boolean {
  return (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    config.apiBaseUrl?.startsWith('http:') === true
  )
}
