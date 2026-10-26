import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { MetricKey } from '../../types/measurement'
import { formatNumber, METRIC_DIGITS, TIME } from '../../utils/format'
import type { Trend } from '../../utils/history'

/** Variações abaixo destes limites são apresentadas como estáveis (precisão típica dos sensores). */
const STABLE_THRESHOLD: Record<MetricKey, number> = { temperature: 0.2, humidity: 1 }

const UNIT_TEXT: Record<MetricKey, { short: string; spoken: string }> = {
  temperature: { short: ' °C', spoken: 'graus Celsius' },
  humidity: { short: '%', spoken: 'pontos percentuais' },
}

export function TrendBadge({ metric, trend }: { metric: MetricKey; trend: Trend }) {
  const windowText = Math.round(trend.windowMs / TIME.MINUTE) >= 55 ? 'na última hora' : `em ${Math.round(trend.windowMs / TIME.MINUTE)} min`
  const magnitude = formatNumber(Math.abs(trend.delta), METRIC_DIGITS[metric])
  const isStable = Math.abs(trend.delta) < STABLE_THRESHOLD[metric]
  const rising = trend.delta > 0

  const Icon = isStable ? Minus : rising ? TrendingUp : TrendingDown
  const text = isStable ? `Estável ${windowText}` : `${rising ? '+' : '−'}${magnitude}${UNIT_TEXT[metric].short} ${windowText}`
  const spoken = isStable
    ? `Estável ${windowText}`
    : `${rising ? 'Subiu' : 'Caiu'} ${magnitude} ${UNIT_TEXT[metric].spoken} ${windowText}`

  return (
    <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium whitespace-nowrap text-ink-soft">
      <Icon className="size-3.5" aria-hidden="true" />
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  )
}
