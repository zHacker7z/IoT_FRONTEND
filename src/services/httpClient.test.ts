import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../types/api'
import { getJson, joinUrl } from './httpClient'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('joinUrl', () => {
  it('junta base e caminho sem duplicar nem perder barras', () => {
    expect(joinUrl('https://vps.exemplo/api/', '/leituras')).toBe('https://vps.exemplo/api/leituras')
    expect(joinUrl('https://vps.exemplo/api', 'leituras?limite=10')).toBe('https://vps.exemplo/api/leituras?limite=10')
  })
})

describe('getJson', () => {
  it('devolve o JSON da resposta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"temperatura":24}', { status: 200 })))
    await expect(getJson('https://api/x', { timeoutMs: 1000 })).resolves.toEqual({ temperatura: 24 })
  })

  it('devolve null para corpo vazio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })))
    await expect(getJson('https://api/x', { timeoutMs: 1000 })).resolves.toBeNull()
  })

  it('classifica erro HTTP com o código', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('falhou', { status: 503 })))
    await expect(getJson('https://api/x', { timeoutMs: 1000 })).rejects.toMatchObject({ kind: 'http', status: 503 })
  })

  it('classifica JSON inválido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })))
    await expect(getJson('https://api/x', { timeoutMs: 1000 })).rejects.toMatchObject({ kind: 'invalid-response' })
  })

  it('classifica falha de rede (inclui bloqueio de CORS)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(getJson('https://api/x', { timeoutMs: 1000 })).rejects.toMatchObject({ kind: 'network' })
  })

  it('interrompe a consulta ao atingir o tempo limite', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          }),
      ),
    )
    const request = getJson('https://api/x', { timeoutMs: 5000 })
    const assertion = expect(request).rejects.toMatchObject({ kind: 'timeout' })
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('identifica cancelamento feito por quem chamou', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          }),
      ),
    )
    const controller = new AbortController()
    const request = getJson('https://api/x', { timeoutMs: 5000, signal: controller.signal })
    controller.abort()
    const error = await request.catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'aborted' })
  })
})
