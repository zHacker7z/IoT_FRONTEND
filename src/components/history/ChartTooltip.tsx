import type { ChartRow } from '../../utils/history'
import { formatNumber, formatTooltipDate } from '../../utils/format'
import type { MetricChartConfig } from './chartTheme'

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  config: MetricChartConfig
}

function isChartRow(value: unknown): value is ChartRow {
  return typeof value === 'object' && value !== null && typeof (value as ChartRow).t === 'number'
}

export function ChartTooltip({ active, payload, config }: ChartTooltipProps) {
  const row = payload?.[0]?.payload
  if (!active || !isChartRow(row)) return null
  const value = row[config.metric]
  if (value === null) return null

  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-[0_8px_24px_-12px_rgba(21,36,42,0.35)]">
      <p className="text-xs text-ink-muted">{formatTooltipDate(new Date(row.t))}</p>
      <p className="mt-1 flex items-center gap-2 font-semibold text-ink">
        <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: config.color }} />
        <span className="tabular">{config.format(value)}</span>
      </p>
      {row.samples > 1 && <p className="mt-1 text-xs text-ink-muted">Média de {formatNumber(row.samples, 0)} medições</p>}
    </div>
  )
}
