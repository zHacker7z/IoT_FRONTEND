import { ChartLine, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import type { HistoryResult } from '../../types/api'
import { describeError } from '../../utils/errorMessages'
import { formatNumber, formatShortDate, formatTime } from '../../utils/format'
import {
  availablePeriods,
  buildChartSeries,
  filterByPeriod,
  summarize,
  timeTicks,
  type PeriodOption,
} from '../../utils/history'
import { Panel } from '../ui/Panel'
import { Skeleton } from '../ui/Skeleton'
import { TechnicalDetails } from '../ui/TechnicalDetails'
import { CHART_COLORS, METRIC_CHARTS } from './chartTheme'
import { PeriodSelector } from './PeriodSelector'

// O Recharts é a maior dependência do painel: carregado à parte, não atrasa as leituras atuais.
const MetricChart = lazy(() => import('./MetricChart').then((module) => ({ default: module.MetricChart })))

interface HistorySectionProps {
  /** `null` enquanto não houve resposta bem-sucedida. */
  history: HistoryResult | null
  isConfigured: boolean
  isLoading: boolean
  isRefreshing: boolean
  now: Date
  onRetry: () => void
}

const DESCRIPTION = 'Variação da temperatura e da umidade ao longo do tempo.'

function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl bg-sunken px-5 py-8 sm:px-8">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-[64ch] text-sm leading-relaxed text-ink-muted">{children}</div>}
      {action}
    </div>
  )
}

function LoadingCharts() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <span className="sr-only">Carregando o histórico…</span>
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-52 w-full rounded-xl sm:h-60" />
        </div>
      ))}
    </div>
  )
}

function Legend({ showGaps }: { showGaps: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted" aria-label="Legenda dos gráficos">
      <li className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-[3px] w-5 rounded-full" style={{ background: METRIC_CHARTS.temperature.color }} />
        Temperatura (°C)
      </li>
      <li className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-[3px] w-5 rounded-full" style={{ background: METRIC_CHARTS.humidity.color }} />
        Umidade relativa (%)
      </li>
      {showGaps && (
        <li className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-5 rounded-sm border border-line"
            style={{
              background: `repeating-linear-gradient(45deg, ${CHART_COLORS.gapFill} 0 3px, ${CHART_COLORS.gapStroke} 3px 5px)`,
            }}
          />
          Período sem medições
        </li>
      )}
    </ul>
  )
}

function RangeCaption({ count, from, to }: { count: number; from: Date; to: Date }) {
  const sameDay = from.toDateString() === to.toDateString()
  const describe = (date: Date) => (sameDay ? formatTime(date) : `${formatShortDate(date)} às ${formatTime(date)}`)
  return (
    <p className="tabular text-xs text-ink-muted">
      {formatNumber(count, 0)} {count === 1 ? 'medição' : 'medições'}, de {describe(from)} a {describe(to)}
      {sameDay ? ` de ${formatShortDate(from)}` : ''}
    </p>
  )
}

export function HistorySection({ history, isConfigured, isLoading, isRefreshing, now, onRetry }: HistorySectionProps) {
  const [selected, setSelected] = useState<PeriodOption['id']>('24h')
  const points = useMemo(() => (history?.status === 'ok' ? history.points : []), [history])
  const periods = useMemo(() => availablePeriods(points, now), [points, now])
  const period = periods.find((option) => option.id === selected) ?? periods[periods.length - 1]
  const visible = useMemo(() => filterByPeriod(points, period, now), [points, period, now])
  const series = useMemo(() => {
    // Períodos fixos terminam agora, para que um atraso nas medições apareça no gráfico.
    const timeWindow: [number, number] | null = period.durationMs === null ? null : [now.getTime() - period.durationMs, now.getTime()]
    return buildChartSeries(visible, timeWindow)
  }, [visible, period, now])
  const axis = useMemo(() => timeTicks(series.domain), [series.domain])

  const showSelector = history?.status === 'ok' && points.length >= 2 && periods.length > 1
  const actions = showSelector ? <PeriodSelector options={periods} value={period.id} onChange={setSelected} /> : undefined

  let content: ReactNode
  if (!isConfigured) {
    content = (
      <EmptyState title="Aguardando conexão com a API">
        Os gráficos aparecem aqui quando o painel estiver conectado à API e ela oferecer o histórico das medições.
      </EmptyState>
    )
  } else if (isLoading && history === null) {
    content = <LoadingCharts />
  } else if (history === null) {
    content = (
      <EmptyState title="Histórico indisponível no momento">
        Não foi possível consultar a API. Os gráficos voltam a aparecer quando a conexão for restabelecida.
      </EmptyState>
    )
  } else if (history.status === 'not-configured') {
    content = (
      <EmptyState title="O histórico ainda não está disponível">
        <p>Por enquanto, o painel mostra apenas a leitura mais recente dos sensores.</p>
        <TechnicalDetails>
          <p>
            Nenhum endpoint de histórico foi configurado. Quando a API oferecer a lista de medições, informe o caminho em{' '}
            <code className="rounded bg-canvas px-1 py-0.5 text-ink">VITE_API_HISTORY_PATH</code> e os gráficos serão exibidos automaticamente.
          </p>
        </TechnicalDetails>
      </EmptyState>
    )
  } else if (history.status === 'error') {
    const description = describeError(history.error)
    content = (
      <EmptyState
        title="Não foi possível carregar o histórico"
        action={
          <button
            type="button"
            onClick={onRetry}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40 disabled:cursor-progress disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Tentar novamente
          </button>
        }
      >
        <p>{description.title}. A leitura atual continua sendo exibida normalmente.</p>
        <TechnicalDetails>
          <p>{description.technical}</p>
        </TechnicalDetails>
      </EmptyState>
    )
  } else if (points.length === 0) {
    content = (
      <EmptyState title="Ainda não há medições no histórico">
        Assim que os sensores enviarem leituras, a variação de temperatura e umidade aparece aqui.
      </EmptyState>
    )
  } else if (points.length === 1) {
    content = (
      <EmptyState title="Há apenas uma medição registrada">
        O gráfico de variação aparece a partir de duas medições.
      </EmptyState>
    )
  } else if (visible.length < 2) {
    content = (
      <EmptyState
        title={`Nenhuma variação para mostrar ${period.phrase}`}
        action={
          <button
            type="button"
            onClick={() => setSelected('all')}
            className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
          >
            Ver todo o histórico
          </button>
        }
      >
        {visible.length === 0 ? 'Não há medições registradas neste período.' : 'Há apenas uma medição neste período.'} A última foi
        registrada em {formatShortDate(points[points.length - 1].timestamp)} às {formatTime(points[points.length - 1].timestamp)}.
      </EmptyState>
    )
  } else {
    content = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <Legend showGaps={series.gaps.length > 0} />
          <RangeCaption count={visible.length} from={visible[0].timestamp} to={visible[visible.length - 1].timestamp} />
        </div>
        <Suspense fallback={<LoadingCharts />}>
          {(['temperature', 'humidity'] as const).map((metric) => (
            <MetricChart
              key={metric}
              config={METRIC_CHARTS[metric]}
              series={series}
              ticks={axis.ticks}
              stepMs={axis.stepMs}
              summary={summarize(visible, metric)}
              periodPhrase={period.phrase}
              now={now}
            />
          ))}
        </Suspense>
        <p className="text-xs text-ink-muted">
          Horários no fuso do seu dispositivo.
          {series.rows.some((row) => row.samples > 1) && ' Em períodos longos, cada ponto do gráfico é a média das medições daquele intervalo.'}
        </p>
      </div>
    )
  }

  return (
    <Panel id="historico" title="Histórico das medições" icon={ChartLine} description={DESCRIPTION} actions={actions}>
      {content}
    </Panel>
  )
}
