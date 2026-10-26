import { toApiError } from '../services/httpClient'
import type { ApiError, ConnectionState, DashboardSnapshot } from '../types/api'

export interface EnvironmentDataState {
  /** Último resultado bem-sucedido; continua disponível quando uma atualização posterior falha. */
  snapshot: DashboardSnapshot | null
  /** Erro da tentativa mais recente, ou `null` se ela deu certo. */
  error: ApiError | null
  connection: ConnectionState
  isLoading: boolean
  isRefreshing: boolean
  /** Verdadeiro apenas durante uma atualização pedida pelo botão. */
  isManualRefresh: boolean
  lastAttemptAt: Date | null
}

export interface EnvironmentStoreOptions {
  isConfigured: boolean
  refreshIntervalMs: number
  fetchSnapshot: (signal: AbortSignal) => Promise<DashboardSnapshot>
}

export interface EnvironmentStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => EnvironmentDataState
  refresh: () => void
}

const hasDocument = () => typeof document !== 'undefined'

/**
 * Consulta periódica da API, fora do React.
 * - Começa com o primeiro assinante e para (cancelando a requisição) com o último.
 * - Nunca sobrepõe requisições: a próxima só é agendada quando a anterior termina.
 * - Com a aba em segundo plano, a atualização automática espera a aba voltar.
 */
export function createEnvironmentStore({ isConfigured, refreshIntervalMs, fetchSnapshot }: EnvironmentStoreOptions): EnvironmentStore {
  // A primeira consulta começa assim que alguém assina, então o estado inicial já é "carregando".
  let state: EnvironmentDataState = {
    snapshot: null,
    error: null,
    connection: isConfigured ? 'checking' : 'not-configured',
    isLoading: isConfigured,
    isRefreshing: isConfigured,
    isManualRefresh: false,
    lastAttemptAt: null,
  }
  const listeners = new Set<() => void>()
  let inFlight: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingWhileHidden = false
  let active = false

  const update = (patch: Partial<EnvironmentDataState>) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const scheduleNext = () => {
    clearTimer()
    if (!active || refreshIntervalMs <= 0) return
    timer = setTimeout(() => {
      if (hasDocument() && document.visibilityState === 'hidden') {
        pendingWhileHidden = true
        return
      }
      void load(false)
    }, refreshIntervalMs)
  }

  async function load(manual: boolean) {
    if (!isConfigured || !active || inFlight !== null) return
    clearTimer()
    const controller = new AbortController()
    inFlight = controller
    if (!state.isRefreshing || state.isManualRefresh !== manual) update({ isRefreshing: true, isManualRefresh: manual })

    try {
      const snapshot = await fetchSnapshot(controller.signal)
      if (controller.signal.aborted) return
      update({
        snapshot,
        error: null,
        connection: 'online',
        isLoading: false,
        isRefreshing: false,
        isManualRefresh: false,
        lastAttemptAt: snapshot.receivedAt,
      })
    } catch (cause) {
      if (controller.signal.aborted) return
      const error = toApiError(cause)
      update({
        error,
        // Resposta HTTP com erro ou JSON inesperado prova que o servidor está no ar, mas falhando.
        connection: error.kind === 'network' || error.kind === 'timeout' ? 'offline' : 'degraded',
        isLoading: false,
        isRefreshing: false,
        isManualRefresh: false,
        lastAttemptAt: new Date(),
      })
    } finally {
      if (inFlight === controller) inFlight = null
      if (!controller.signal.aborted) scheduleNext()
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && pendingWhileHidden) {
      pendingWhileHidden = false
      void load(false)
    }
  }

  const start = () => {
    active = true
    if (hasDocument()) document.addEventListener('visibilitychange', onVisibilityChange)
    void load(false)
  }

  const stop = () => {
    active = false
    if (hasDocument()) document.removeEventListener('visibilitychange', onVisibilityChange)
    clearTimer()
    inFlight?.abort()
    inFlight = null
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1) start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stop()
      }
    },
    getSnapshot: () => state,
    refresh: () => {
      void load(true)
    },
  }
}
