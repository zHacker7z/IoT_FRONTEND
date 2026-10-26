import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type DashboardSnapshot } from '../types/api'
import { createEnvironmentStore } from './environmentStore'

const snapshot = (): DashboardSnapshot => ({
  latest: { temperature: 24, humidity: 55, timestamp: new Date() },
  history: { status: 'not-configured' },
  receivedAt: new Date(),
})

/** Requisição que só termina depois de `delayMs`, respeitando o cancelamento. */
function delayedFetch(delayMs: number, result: () => DashboardSnapshot | ApiError = snapshot) {
  return vi.fn(
    (signal: AbortSignal) =>
      new Promise<DashboardSnapshot>((resolve, reject) => {
        const id = setTimeout(() => {
          const value = result()
          if (value instanceof ApiError) reject(value)
          else resolve(value)
        }, delayMs)
        signal.addEventListener('abort', () => {
          clearTimeout(id)
          reject(new ApiError('aborted', 'cancelada', ''))
        })
      }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createEnvironmentStore', () => {
  it('consulta ao receber o primeiro assinante e agenda a próxima só depois da resposta', async () => {
    const fetchSnapshot = delayedFetch(3_000)
    const store = createEnvironmentStore({ isConfigured: true, refreshIntervalMs: 10_000, fetchSnapshot })
    const unsubscribe = store.subscribe(() => {})

    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toMatchObject({ isLoading: true, connection: 'checking' })

    await vi.advanceTimersByTimeAsync(3_000)
    expect(store.getSnapshot()).toMatchObject({ isLoading: false, isRefreshing: false, connection: 'online' })

    // O intervalo conta a partir do fim da resposta: 9,9 s depois ainda não houve nova consulta.
    await vi.advanceTimersByTimeAsync(9_900)
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('ignora atualização manual enquanto outra consulta está em andamento', async () => {
    const fetchSnapshot = delayedFetch(3_000)
    const store = createEnvironmentStore({ isConfigured: true, refreshIntervalMs: 0, fetchSnapshot })
    const unsubscribe = store.subscribe(() => {})

    store.refresh()
    store.refresh()
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3_000)
    store.refresh()
    expect(store.getSnapshot()).toMatchObject({ isRefreshing: true, isManualRefresh: true })
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('mantém o último dado válido quando uma atualização falha', async () => {
    let fail = false
    const fetchSnapshot = delayedFetch(100, () => (fail ? new ApiError('network', 'sem rede', 'https://api') : snapshot()))
    const store = createEnvironmentStore({ isConfigured: true, refreshIntervalMs: 0, fetchSnapshot })
    const unsubscribe = store.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(100)

    fail = true
    store.refresh()
    await vi.advanceTimersByTimeAsync(100)
    expect(store.getSnapshot().snapshot?.latest?.temperature).toBe(24)
    expect(store.getSnapshot()).toMatchObject({ connection: 'offline', error: { kind: 'network' } })
    unsubscribe()
  })

  it('cancela a consulta e o agendamento quando o último assinante sai', async () => {
    const fetchSnapshot = delayedFetch(3_000)
    const store = createEnvironmentStore({ isConfigured: true, refreshIntervalMs: 1_000, fetchSnapshot })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()

    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    expect(fetchSnapshot.mock.calls[0][0].aborted).toBe(true)
    expect(listener).not.toHaveBeenCalled()
  })

  it('não consulta nada sem configuração', () => {
    const fetchSnapshot = delayedFetch(10)
    const store = createEnvironmentStore({ isConfigured: false, refreshIntervalMs: 1_000, fetchSnapshot })
    const unsubscribe = store.subscribe(() => {})
    store.refresh()
    expect(fetchSnapshot).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toMatchObject({ connection: 'not-configured', isLoading: false })
    unsubscribe()
  })
})
