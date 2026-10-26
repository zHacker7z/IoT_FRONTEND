import { Clock3, RefreshCw } from 'lucide-react'
import type { ConnectionState } from '../../types/api'
import type { Measurement } from '../../types/measurement'
import { formatCalendarDateTime, formatDateTime } from '../../utils/format'
import { ConnectionBadge } from '../status/ConnectionBadge'
import { LogoMark } from './LogoMark'

interface HeaderProps {
  connection: ConnectionState
  latest: Measurement | null
  hasData: boolean
  now: Date
  canRefresh: boolean
  isRefreshing: boolean
  isManualRefresh: boolean
  onRefresh: () => void
}

function LastReading({ latest, hasData, now }: Pick<HeaderProps, 'latest' | 'hasData' | 'now'>) {
  let text = 'Sem leituras recebidas'
  if (hasData && latest === null) text = 'Nenhuma medição registrada'
  if (latest !== null) text = latest.timestamp ? formatCalendarDateTime(latest.timestamp, now) : 'Horário não informado pela API'

  return (
    <div className="order-last flex w-full items-center gap-2.5 text-sm sm:order-none sm:w-auto">
      <Clock3 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <div className="leading-tight">
        <span className="block text-xs text-ink-muted">Última leitura</span>
        {latest?.timestamp ? (
          <time dateTime={latest.timestamp.toISOString()} title={formatDateTime(latest.timestamp, true)} className="tabular font-medium text-ink">
            {text}
          </time>
        ) : (
          <span className="font-medium text-ink-soft">{text}</span>
        )}
      </div>
    </div>
  )
}

export function Header({ connection, latest, hasData, now, canRefresh, isRefreshing, isManualRefresh, onRefresh }: HeaderProps) {
  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex items-start gap-4 sm:items-center">
        <LogoMark />
        <div className="min-w-0">
          <h1 className="extra-wide text-[1.65rem] font-semibold leading-none tracking-tight text-ink sm:text-[2.1rem]">
            Monitoramento Ambiental
          </h1>
          <p className="mt-2 text-[0.95rem] leading-snug text-pretty text-ink-muted">
            Monitoramento de temperatura, umidade e condições meteorológicas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ConnectionBadge state={connection} />
        <LastReading latest={latest} hasData={hasData} now={now} />
        <button
          type="button"
          onClick={() => {
            if (!isRefreshing) onRefresh()
          }}
          disabled={!canRefresh}
          aria-disabled={isRefreshing || undefined}
          aria-busy={isRefreshing}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-soft aria-disabled:cursor-progress aria-disabled:bg-ink-soft disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted xl:ml-0"
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRefreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
        <span className="sr-only" role="status">
          {isManualRefresh ? 'Atualizando os dados.' : ''}
        </span>
      </div>
    </header>
  )
}
