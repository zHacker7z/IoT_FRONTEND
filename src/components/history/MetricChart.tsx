import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCalendarDateTime, formatShortDate, formatTime, TIME } from '../../utils/format'
import { valueAxis, type ChartSeries, type MetricSummary } from '../../utils/history'
import { CHART_COLORS, type MetricChartConfig } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

interface MetricChartProps {
  config: MetricChartConfig
  series: ChartSeries
  ticks: number[]
  stepMs: number
  summary: MetricSummary | null
  /** Período em palavras, para o resumo lido por leitores de tela. */
  periodPhrase: string
  now: Date
}

function formatXTick(value: number, stepMs: number): string {
  const date = new Date(value)
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0
  if (stepMs >= TIME.DAY || isMidnight) return formatShortDate(date)
  return formatTime(date)
}

function SummaryItem({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular text-sm font-semibold text-ink">
        {value}
        {detail && <span className="block font-normal text-ink-muted sm:ml-1.5 sm:inline">{detail}</span>}
      </dd>
    </div>
  )
}

export function MetricChart({ config, series, ticks, stepMs, summary, periodPhrase, now }: MetricChartProps) {
  const patternId = `sem-dados-${config.metric}`
  const axis = summary ? valueAxis(summary.min.value, summary.max.value, config.axisPadding, config.axisClamp) : null

  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <figcaption className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="h-[3px] w-5 rounded-full" style={{ background: config.color }} />
          {config.title} <span className="font-normal text-ink-muted">({config.unitLabel})</span>
        </figcaption>
        {summary && (
          <dl className="grid w-full grid-cols-3 gap-x-4 gap-y-1 sm:flex sm:w-auto sm:gap-x-7">
            <SummaryItem label="Mínima" value={config.format(summary.min.value)} detail={formatCalendarDateTime(summary.min.at, now)} />
            <SummaryItem label="Média" value={config.format(summary.average)} />
            <SummaryItem label="Máxima" value={config.format(summary.max.value)} detail={formatCalendarDateTime(summary.max.at, now)} />
          </dl>
        )}
      </div>

      {summary && (
        <p className="sr-only">
          {config.title} {periodPhrase}: mínima de {config.format(summary.min.value)}, máxima de {config.format(summary.max.value)} e média de{' '}
          {config.format(summary.average)}.
        </p>
      )}

      {axis ? (
        <div className="h-52 w-full sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.rows} syncId="historico" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill={CHART_COLORS.gapFill} />
                  <line x1="0" y1="0" x2="0" y2="7" stroke={CHART_COLORS.gapStroke} strokeWidth="2" />
                </pattern>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              {series.gaps.map((gap) => (
                <ReferenceArea
                  key={gap.start}
                  x1={gap.start}
                  x2={gap.end}
                  fill={`url(#${patternId})`}
                  fillOpacity={1}
                  stroke="none"
                  ifOverflow="hidden"
                />
              ))}
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={series.domain}
                ticks={ticks}
                tickFormatter={(value: number) => formatXTick(value, stepMs)}
                tick={{ fill: CHART_COLORS.tick, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                domain={axis.domain}
                ticks={axis.ticks}
                tickFormatter={(value: number) => config.formatTick(value, axis.fractionDigits)}
                tick={{ fill: CHART_COLORS.tick, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={58}
              />
              <Tooltip
                content={({ active, payload }) => <ChartTooltip active={active} payload={payload} config={config} />}
                cursor={{ stroke: CHART_COLORS.cursor, strokeDasharray: '3 3' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={config.metric}
                name={config.title}
                stroke={config.color}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4.5, stroke: '#ffffff', strokeWidth: 2, fill: config.color }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-xl bg-sunken px-4 py-6 text-sm text-ink-muted">
          Nenhum valor válido de {config.title.toLowerCase()} {periodPhrase}.
        </p>
      )}
    </figure>
  )
}
