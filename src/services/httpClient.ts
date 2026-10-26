import { ApiError } from '../types/api'

export interface GetJsonOptions {
  timeoutMs: number
  signal?: AbortSignal
}

/** Junta URL-base e caminho sem duplicar nem perder barras (`/api` + `leituras` → `/api/leituras`). */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

/**
 * GET com tempo limite e erros tipados. Usa apenas o cabeçalho `Accept`,
 * que não dispara preflight de CORS.
 */
export async function getJson(url: string, { timeoutMs, signal }: GetJsonOptions): Promise<unknown> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  const failure = (cause: unknown): ApiError => {
    if (cause instanceof ApiError) return cause
    if (timedOut) return new ApiError('timeout', `A API não respondeu em ${timeoutMs / 1000} s.`, url)
    if (signal?.aborted) return new ApiError('aborted', 'Consulta cancelada.', url)
    return new ApiError('network', 'Não foi possível alcançar a API.', url)
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new ApiError('http', `A API respondeu com o código ${response.status}.`, url, response.status)
    }
    const body = await response.text()
    if (body.trim() === '') return null
    try {
      return JSON.parse(body) as unknown
    } catch {
      throw new ApiError('invalid-response', 'A resposta da API não está em formato JSON.', url, response.status)
    }
  } catch (cause) {
    throw failure(cause)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

export function toApiError(error: unknown, url = ''): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError('invalid-response', 'Erro inesperado ao ler a resposta da API.', url)
}
