import type { ApiError } from '../types/api'
import { isMixedContent } from '../config/env'

export interface ErrorDescription {
  /** Frase curta para o usuário. */
  title: string
  /** O que fazer a seguir, em linguagem simples. */
  message: string
  /** Diagnóstico para quem mantém o sistema. */
  technical: string
}

function describeHttpStatus(status: number | null): string {
  if (status === null) return 'Resposta HTTP sem código.'
  if (status === 401 || status === 403) return `Código ${status}: acesso negado. A API pode exigir autenticação, que este painel não envia.`
  if (status === 404) return 'Código 404: o endpoint configurado não existe no servidor. Confira VITE_API_LATEST_PATH e VITE_API_HISTORY_PATH.'
  if (status === 429) return 'Código 429: muitas consultas. Aumente VITE_REFRESH_INTERVAL_SECONDS.'
  if (status >= 500) return `Código ${status}: erro interno no servidor da API.`
  return `Código ${status}.`
}

export function describeError(error: ApiError): ErrorDescription {
  switch (error.kind) {
    case 'timeout':
      return {
        title: 'A API demorou demais para responder',
        message: 'O servidor pode estar sobrecarregado ou a conexão está lenta. Tente novamente em instantes.',
        technical: `${error.message} Endereço: ${error.url}`,
      }
    case 'http':
      return {
        title: 'A API respondeu com um erro',
        message: 'O servidor está no ar, mas não conseguiu entregar as medições agora.',
        technical: `${describeHttpStatus(error.status)} Endereço: ${error.url}`,
      }
    case 'invalid-response':
      return {
        title: 'Os dados chegaram em um formato inesperado',
        message: 'A API respondeu, mas o painel não reconheceu as medições na resposta.',
        technical: `${error.message} Endereço: ${error.url}. Ajuste VITE_API_FIELD_* ou o adaptador em src/services/normalizers.ts.`,
      }
    case 'network':
    case 'aborted':
    default: {
      const causes = isMixedContent()
        ? 'O painel está em HTTPS e a API em HTTP: o navegador bloqueia esse acesso (conteúdo misto). Publique a API em HTTPS.'
        : 'Causas possíveis: servidor fora do ar, endereço incorreto ou bloqueio de CORS (a API precisa liberar a origem deste painel).'
      return {
        title: 'Não foi possível conectar à API',
        message: 'Verifique se o servidor está no ar e se há conexão com a internet.',
        technical: `${causes} Endereço: ${error.url}`,
      }
    }
  }
}
