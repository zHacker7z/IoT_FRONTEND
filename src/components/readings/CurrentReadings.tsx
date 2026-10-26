import { Droplets, Thermometer } from 'lucide-react'
import {
  HUMIDITY_ALERT_ZONES,
  HUMIDITY_SCALE,
  humidityAlertZone,
  TEMPERATURE_SCALE,
  ZONE_COLORS,
} from '../../config/references'
import type { MetricKey, Measurement, TimedMeasurement } from '../../types/measurement'
import { formatDuration, formatHumidity, formatNumber, formatTemperature, TIME } from '../../utils/format'
import type { Freshness } from '../../utils/freshness'
import { computeTrend, summarize, type MetricSummary } from '../../utils/history'
import { InstrumentScale } from './InstrumentScale'
import { ReadingGauge, type ReadingState } from './ReadingGauge'

/** Frio → ameno → quente, nas posições aproximadas de 0, 15, 27, 36 e 50 °C. */
const TEMPERATURE_TRACK = 'linear-gradient(90deg, #6f98c4 0%, #84b8b3 30%, #e7c56f 54%, #df8d34 72%, #c4452f 100%)'
/** Ar seco → úmido. As faixas de alerta são desenhadas por cima. */
const HUMIDITY_TRACK = 'linear-gradient(90deg, #cfe5e8 0%, #8cc3cb 45%, #1b7f8e 100%)'

interface CurrentReadingsProps {
  state: ReadingState
  latest: Measurement | null
  history: readonly TimedMeasurement[]
  freshness: Freshness
  /** Texto usado quando não há valor, de acordo com o motivo. */
  emptyMessage: string
  now: Date
}

/** Mínima e máxima das últimas 24 horas, quando o histórico tem ao menos duas medições nesse período. */
function lastDayRange(history: readonly TimedMeasurement[], metric: MetricKey, now: Date): MetricSummary | null {
  const since = now.getTime() - TIME.DAY
  const recent = history.filter((point) => point.timestamp.getTime() >= since && point[metric] !== null)
  return recent.length >= 2 ? summarize(recent, metric) : null
}

function RecentRange({ summary, format }: { summary: MetricSummary; format: (value: number) => string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-ink-muted">
      <span aria-hidden="true" className="h-2.5 w-4 shrink-0 rounded-full border-[1.5px] border-ink/45" />
      <span>
        Últimas 24 h: de <span className="tabular font-medium text-ink-soft">{format(summary.min.value)}</span> a{' '}
        <span className="tabular font-medium text-ink-soft">{format(summary.max.value)}</span>
      </span>
    </p>
  )
}

function FreshnessChip({ freshness, state }: { freshness: Freshness; state: ReadingState }) {
  if (state !== 'ready') return null
  if (freshness.kind === 'unknown') {
    return <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-muted">Horário da medição não informado</span>
  }
  const stale = freshness.kind === 'stale'
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        stale ? 'bg-warn-wash text-warn' : 'bg-ok-wash text-ok'
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${stale ? 'bg-warn' : 'bg-ok'}`} />
      {stale ? `Sem novas medições há ${formatDuration(freshness.ageMs)}` : 'Leituras em dia'}
    </span>
  )
}

function HumidityReference({ humidity }: { humidity: number | null }) {
  const zone = humidity === null ? null : humidityAlertZone(humidity)
  return (
    <div className="mt-1 flex flex-col gap-2">
      {humidity !== null && (
        <p className={`text-sm font-medium ${zone ? 'text-warn' : 'text-ink-soft'}`}>
          {zone ? `${zone.label} para ar seco` : 'Fora dos níveis de alerta para ar seco'}
        </p>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Níveis de alerta da Defesa Civil">
        {HUMIDITY_ALERT_ZONES.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: ZONE_COLORS[item.tone] }} />
            {item.label.replace('Estado de ', '')}
            <span className="tabular">{item.rangeLabel}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">Referência: níveis de alerta da Defesa Civil para umidade relativa do ar.</p>
    </div>
  )
}

export function CurrentReadings({ state, latest, history, freshness, emptyMessage, now }: CurrentReadingsProps) {
  const temperature = latest?.temperature ?? null
  const humidity = latest?.humidity ?? null
  const measuredAt = latest?.timestamp ?? null
  const shown = (value: number | null) => (state === 'ready' ? value : null)
  const temperatureRange = state === 'ready' ? lastDayRange(history, 'temperature', now) : null
  const humidityRange = state === 'ready' ? lastDayRange(history, 'humidity', now) : null
  const asRange = (summary: MetricSummary | null) => (summary ? { min: summary.min.value, max: summary.max.value } : null)

  return (
    <section aria-labelledby="readings-title" className="overflow-hidden rounded-[1.75rem] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
        <div>
          <h2 id="readings-title" className="wide text-lg font-semibold tracking-tight text-ink">
            Leituras atuais
          </h2>
          <p className="text-sm text-pretty text-ink-muted">Valores enviados pelos sensores do Raspberry Pi.</p>
        </div>
        <FreshnessChip freshness={freshness} state={state} />
      </div>

      <div className="grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        <ReadingGauge
          metric="temperature"
          title="Temperatura"
          icon={Thermometer}
          unit="°C"
          unitSpoken="graus Celsius"
          state={state}
          value={shown(temperature)}
          measuredAt={measuredAt}
          emptyMessage={state === 'ready' && latest !== null ? 'A última medição não trouxe uma temperatura válida.' : emptyMessage}
          trend={computeTrend(history, 'temperature')}
          scale={
            <div className="flex flex-col gap-3">
              <InstrumentScale
                {...TEMPERATURE_SCALE}
                value={shown(temperature)}
                track={TEMPERATURE_TRACK}
                range={asRange(temperatureRange)}
                formatTick={(tick) => `${tick}°`}
                label="Escala de temperatura de 0 a 50 °C"
                valueText={temperature === null ? null : formatTemperature(temperature)}
              />
              {temperatureRange && <RecentRange summary={temperatureRange} format={formatTemperature} />}
            </div>
          }
        />
        <ReadingGauge
          metric="humidity"
          title="Umidade do ar"
          icon={Droplets}
          unit="%"
          unitSpoken="por cento de umidade relativa"
          state={state}
          value={shown(humidity)}
          measuredAt={measuredAt}
          emptyMessage={state === 'ready' && latest !== null ? 'A última medição não trouxe uma umidade válida.' : emptyMessage}
          trend={computeTrend(history, 'humidity')}
          scale={
            <div className="flex flex-col gap-3">
              <InstrumentScale
                {...HUMIDITY_SCALE}
                value={shown(humidity)}
                track={HUMIDITY_TRACK}
                zones={HUMIDITY_ALERT_ZONES}
                range={asRange(humidityRange)}
                formatTick={(tick) => `${formatNumber(tick, 0)}%`}
                label="Escala de umidade relativa de 0 a 100%"
                valueText={humidity === null ? null : formatHumidity(humidity)}
              />
              {humidityRange && <RecentRange summary={humidityRange} format={formatHumidity} />}
              {state !== 'loading' && <HumidityReference humidity={shown(humidity)} />}
            </div>
          }
        />
      </div>
    </section>
  )
}
