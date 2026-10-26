import { appConfig, type AppConfig } from '../config/env'
import { ApiError, type DashboardSnapshot, type HistoryResult } from '../types/api'
import type { Measurement, TimedMeasurement } from '../types/measurement'
import { getJson, joinUrl, toApiError } from './httpClient'
import { parseLatestResponse, parseSeriesResponse } from './normalizers'

/** Ponto único de acesso à API do projeto. Os componentes nunca chamam `fetch` diretamente. */

async function fetchLatest(config: AppConfig, baseUrl: string, path: string, signal: AbortSignal): Promise<Measurement | null> {
  const url = joinUrl(baseUrl, path)
  const raw = await getJson(url, { timeoutMs: config.timeoutMs, signal })
  const result = parseLatestResponse(raw, config.fields)
  if (result.kind === 'unrecognized') {
    throw new ApiError('invalid-response', 'A resposta da leitura atual não tem temperatura nem umidade reconhecíveis.', url)
  }
  return result.kind === 'measurement' ? result.measurement : null
}

async function fetchHistory(
  config: AppConfig,
  baseUrl: string,
  path: string,
  signal: AbortSignal,
): Promise<{ points: TimedMeasurement[]; discarded: number }> {
  const url = joinUrl(baseUrl, path)
  const raw = await getJson(url, { timeoutMs: config.timeoutMs, signal })
  const result = parseSeriesResponse(raw, config.fields)
  if (result.kind === 'unrecognized') {
    throw new ApiError('invalid-response', 'A resposta do histórico não contém uma lista de medições reconhecível.', url)
  }
  return { points: result.points, discarded: result.discarded }
}

/**
 * Busca leitura atual e histórico em paralelo. Falha no histórico não derruba
 * a leitura atual; quando só o histórico está configurado, a leitura atual é o
 * ponto mais recente dele.
 */
export async function fetchDashboardSnapshot(signal: AbortSignal, config: AppConfig = appConfig): Promise<DashboardSnapshot> {
  const { apiBaseUrl, latestPath, historyPath } = config
  if (apiBaseUrl === null || (latestPath === null && historyPath === null)) {
    throw new ApiError('invalid-response', 'A API não está configurada.', '')
  }

  const [latestOutcome, historyOutcome] = await Promise.allSettled([
    latestPath === null ? Promise.resolve(null) : fetchLatest(config, apiBaseUrl, latestPath, signal),
    historyPath === null ? Promise.resolve(null) : fetchHistory(config, apiBaseUrl, historyPath, signal),
  ])

  let history: HistoryResult
  if (historyPath === null) {
    history = { status: 'not-configured' }
  } else if (historyOutcome.status === 'fulfilled' && historyOutcome.value !== null) {
    history = { status: 'ok', ...historyOutcome.value }
  } else {
    history = { status: 'error', error: toApiError(historyOutcome.status === 'rejected' ? historyOutcome.reason : null) }
  }

  if (latestPath !== null) {
    if (latestOutcome.status === 'rejected') throw toApiError(latestOutcome.reason)
    return { latest: latestOutcome.value, history, receivedAt: new Date() }
  }

  if (history.status === 'error') throw history.error
  const points = history.status === 'ok' ? history.points : []
  return { latest: points.at(-1) ?? null, history, receivedAt: new Date() }
}
