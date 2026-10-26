import { CircleAlert, Info, PlugZap, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { configStatus } from '../../config/env'
import type { ApiError } from '../../types/api'
import { describeError } from '../../utils/errorMessages'
import { formatDuration, formatRelative, formatTime } from '../../utils/format'
import type { Freshness } from '../../utils/freshness'
import { TechnicalDetails } from '../ui/TechnicalDetails'

type Tone = 'info' | 'warn' | 'danger'

const TONES: Record<Tone, { frame: string; icon: string }> = {
  info: { frame: 'border-line bg-surface', icon: 'bg-canvas text-ink-soft' },
  warn: { frame: 'border-warn/30 bg-warn-wash', icon: 'bg-warn/10 text-warn' },
  danger: { frame: 'border-danger/30 bg-danger-wash', icon: 'bg-danger/10 text-danger' },
}

interface NoticeProps {
  tone: Tone
  icon: LucideIcon
  title: string
  children: ReactNode
  action?: ReactNode
}

function Notice({ tone, icon: Icon, title, children, action }: NoticeProps) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-start sm:p-5 ${TONES[tone].frame}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONES[tone].icon}`} aria-hidden="true">
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>
      {action}
    </div>
  )
}

function RetryButton({ onRetry, disabled }: { onRetry: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled}
      className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40 disabled:cursor-progress disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${disabled ? 'animate-spin' : ''}`} aria-hidden="true" />
      Tentar novamente
    </button>
  )
}

interface StatusNoticeProps {
  isConfigured: boolean
  error: ApiError | null
  hasSnapshot: boolean
  lastSuccessAt: Date | null
  isEmpty: boolean
  freshness: Freshness
  staleAfterMs: number
  now: Date
  isRefreshing: boolean
  onRetry: () => void
}

/** Mostra no máximo um aviso, do mais importante para o menos importante. */
export function StatusNotice({
  isConfigured,
  error,
  hasSnapshot,
  lastSuccessAt,
  isEmpty,
  freshness,
  staleAfterMs,
  now,
  isRefreshing,
  onRetry,
}: StatusNoticeProps) {
  if (!isConfigured) {
    return (
      <Notice tone="info" icon={PlugZap} title="O painel ainda não está conectado à API">
        <p>As leituras de temperatura e umidade aparecem aqui assim que o endereço da API e os endpoints forem configurados.</p>
        <TechnicalDetails summary="Como configurar">
          <ul className="list-disc space-y-1 pl-5">
            {configStatus.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p>
            Copie <code className="rounded bg-canvas px-1 py-0.5 text-ink">.env.example</code> para{' '}
            <code className="rounded bg-canvas px-1 py-0.5 text-ink">.env.local</code>, preencha os valores e reinicie o servidor de desenvolvimento.
          </p>
        </TechnicalDetails>
      </Notice>
    )
  }

  if (error !== null) {
    const description = describeError(error)
    const retry = <RetryButton onRetry={onRetry} disabled={isRefreshing} />
    if (!hasSnapshot) {
      return (
        <Notice tone="danger" icon={CircleAlert} title={description.title} action={retry}>
          <p>{description.message}</p>
          <TechnicalDetails>
            <p>{description.technical}</p>
          </TechnicalDetails>
        </Notice>
      )
    }
    return (
      <Notice tone="warn" icon={TriangleAlert} title="Não foi possível atualizar os dados" action={retry}>
        <p>
          {description.title}.{' '}
          {lastSuccessAt && `Exibindo as informações recebidas às ${formatTime(lastSuccessAt)} (${formatRelative(lastSuccessAt, now)}).`}
        </p>
        <TechnicalDetails>
          <p>{description.technical}</p>
        </TechnicalDetails>
      </Notice>
    )
  }

  if (isEmpty) {
    return (
      <Notice tone="info" icon={Info} title="A API ainda não tem medições registradas">
        <p>A conexão está funcionando. Assim que os sensores enviarem a primeira leitura, ela aparece aqui.</p>
      </Notice>
    )
  }

  if (freshness.kind === 'stale') {
    return (
      <Notice tone="warn" icon={TriangleAlert} title="As leituras estão desatualizadas">
        <p>
          A medição mais recente foi feita há {formatDuration(freshness.ageMs)}, acima do limite de {formatDuration(staleAfterMs)}. Os sensores
          podem ter parado de enviar dados — a API continua respondendo normalmente.
        </p>
      </Notice>
    )
  }

  return null
}
