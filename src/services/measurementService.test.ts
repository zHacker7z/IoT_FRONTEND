import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppConfig } from '../config/env'
import { fetchDashboardSnapshot } from './measurementService'

const baseConfig: AppConfig = {
  apiBaseUrl: 'https://api.teste',
  latestPath: '/atual',
  historyPath: '/historico',
  timeoutMs: 1000,
  refreshIntervalMs: 0,
  staleAfterMs: 15 * 60_000,
  fields: { temperature: null, humidity: null, timestamp: null },
}

function routeFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const route = routes[new URL(url).pathname]
      return route ? route() : new Response('não encontrado', { status: 404 })
    }),
  )
}

const json = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200 })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDashboardSnapshot', () => {
  it('combina leitura atual e histórico', async () => {
    routeFetch({
      '/atual': json({ temperatura: 25, umidade: 55, timestamp: '2026-10-23T12:00:00Z' }),
      '/historico': json([
        { temperatura: 24, umidade: 56, timestamp: '2026-10-23T11:00:00Z' },
        { temperatura: 25, umidade: 55, timestamp: '2026-10-23T12:00:00Z' },
      ]),
    })
    const snapshot = await fetchDashboardSnapshot(new AbortController().signal, baseConfig)
    expect(snapshot.latest).toMatchObject({ temperature: 25, humidity: 55 })
    expect(snapshot.history).toMatchObject({ status: 'ok', discarded: 0 })
  })

  it('mantém a leitura atual quando só o histórico falha', async () => {
    routeFetch({
      '/atual': json({ temperatura: 25, umidade: 55 }),
      '/historico': () => new Response('erro', { status: 500 }),
    })
    const snapshot = await fetchDashboardSnapshot(new AbortController().signal, baseConfig)
    expect(snapshot.latest?.temperature).toBe(25)
    expect(snapshot.history).toMatchObject({ status: 'error', error: { kind: 'http', status: 500 } })
  })

  it('falha quando a leitura atual falha', async () => {
    routeFetch({ '/historico': json([]) })
    await expect(fetchDashboardSnapshot(new AbortController().signal, baseConfig)).rejects.toMatchObject({ kind: 'http', status: 404 })
  })

  it('usa o ponto mais recente do histórico quando não há endpoint de leitura atual', async () => {
    routeFetch({
      '/historico': json({
        dados: [
          { temp: 20, umid: 60, created_at: '2026-10-23T10:00:00Z' },
          { temp: 21, umid: 58, created_at: '2026-10-23T11:00:00Z' },
        ],
      }),
    })
    const snapshot = await fetchDashboardSnapshot(new AbortController().signal, { ...baseConfig, latestPath: null })
    expect(snapshot.latest).toMatchObject({ temperature: 21, humidity: 58 })
  })

  it('não inventa histórico quando ele não está configurado', async () => {
    routeFetch({ '/atual': json({ temperatura: 25 }) })
    const snapshot = await fetchDashboardSnapshot(new AbortController().signal, { ...baseConfig, historyPath: null })
    expect(snapshot.history).toEqual({ status: 'not-configured' })
  })

  it('rejeita resposta sem medições reconhecíveis', async () => {
    routeFetch({ '/atual': json({ status: 'ok' }), '/historico': json([]) })
    await expect(fetchDashboardSnapshot(new AbortController().signal, baseConfig)).rejects.toMatchObject({ kind: 'invalid-response' })
  })
})
