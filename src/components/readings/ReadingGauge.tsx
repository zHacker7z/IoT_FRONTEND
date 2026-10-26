import { Clock3, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MetricKey } from '../../types/measurement'
import { formatDateTime, formatNumber, METRIC_DIGITS } from '../../utils/format'
import type { Trend } from '../../utils/history'
import { Skeleton } from '../ui/Skeleton'
import { TrendBadge } from './TrendBadge'

export type ReadingState = 'loading' | 'ready' | 'unavailable'

interface ReadingGaugeProps {
  metric: MetricKey
  title: string
  icon: LucideIcon
  unit: string
  /** Unidade por extenso para leitores de tela. */
  unitSpoken: string
  state: ReadingState
  value: number | null
  measuredAt: Date | null
  /** Explicação exibida quando não há valor. */
  emptyMessage: string
  trend: Trend | null
  scale: ReactNode
}

const ACCENTS: Record<MetricKey, { icon: string; value: string; unit: string }> = {
  temperature: { icon: 'bg-temp-wash text-temp-ink', value: 'text-ink', unit: 'text-temp-ink' },
  humidity: { icon: 'bg-humid-wash text-humid-ink', value: 'text-ink', unit: 'text-humid-ink' },
}

export function ReadingGauge({
  metric,
  title,
  icon: Icon,
  unit,
  unitSpoken,
  state,
  value,
  measuredAt,
  emptyMessage,
  trend,
  scale,
}: ReadingGaugeProps) {
  const accent = ACCENTS[metric]
  const headingId = `reading-${metric}`

  return (
    <article aria-labelledby={headingId} aria-busy={state === 'loading'} className="flex flex-col gap-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 place-items-center rounded-xl ${accent.icon}`} aria-hidden="true">
            <Icon className="size-5" strokeWidth={1.9} />
          </span>
          <h3 id={headingId} className="text-base font-semibold whitespace-nowrap text-ink">
            {title}
          </h3>
        </div>
        {state === 'ready' && trend && value !== null && <TrendBadge metric={metric} trend={trend} />}
      </div>

      <div className="min-h-[5.5rem] sm:min-h-[7rem]">
        {state === 'loading' && (
          <>
            <Skeleton className="h-20 w-48 sm:h-24 sm:w-60" />
            <span className="sr-only">Carregando {title.toLowerCase()}…</span>
          </>
        )}
        {state !== 'loading' && value !== null && (
          <p className="flex items-start leading-none">
            <span className={`wide tabular text-[4.75rem] font-light tracking-[-0.04em] sm:text-[6.5rem] ${accent.value}`}>
              {formatNumber(value, METRIC_DIGITS[metric])}
            </span>
            <span className={`ml-1.5 mt-2 text-2xl font-medium sm:mt-3 sm:text-3xl ${accent.unit}`} aria-hidden="true">
              {unit}
            </span>
            <span className="sr-only">{unitSpoken}</span>
          </p>
        )}
        {state !== 'loading' && value === null && (
          <div className="flex h-full flex-col justify-center gap-1.5 py-2">
            <p className="wide text-3xl font-light text-ink-muted sm:text-4xl">Sem leitura</p>
            <p className="max-w-[40ch] text-sm leading-relaxed text-ink-muted">{emptyMessage}</p>
          </div>
        )}
      </div>

      {scale}

      <div className="mt-auto flex items-center border-t border-line pt-4 text-sm">
        {state === 'loading' ? (
          <Skeleton className="h-4 w-44" />
        ) : (
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <Clock3 className="size-4" aria-hidden="true" />
            {measuredAt ? (
              <span>
                Medida em{' '}
                <time dateTime={measuredAt.toISOString()} className="tabular text-ink-soft">
                  {formatDateTime(measuredAt)}
                </time>
              </span>
            ) : (
              <span>{value === null ? 'Nenhuma medição disponível' : 'Horário da medição não informado'}</span>
            )}
          </span>
        )}
      </div>
    </article>
  )
}
