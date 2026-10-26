import type { Measurement, TimedMeasurement } from './measurement'

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'invalid-response' | 'aborted'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly url: string
  readonly status: number | null

  constructor(kind: ApiErrorKind, message: string, url: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.url = url
    this.status = status
  }
}

export type HistoryResult =
  | { status: 'not-configured' }
  /** `discarded`: itens da resposta ignorados por não terem horário válido (ou por horário repetido). */
  | { status: 'ok'; points: TimedMeasurement[]; discarded: number }
  | { status: 'error'; error: ApiError }

export interface DashboardSnapshot {
  /** `null` quando a API respondeu sem nenhuma medição. */
  latest: Measurement | null
  history: HistoryResult
  /** Momento (relógio do navegador) em que a consulta terminou com sucesso. */
  receivedAt: Date
}

/** `degraded`: o servidor respondeu, mas com erro HTTP ou dados ilegíveis. */
export type ConnectionState = 'not-configured' | 'checking' | 'online' | 'degraded' | 'offline'
