import type { MetricKey, TimedMeasurement } from '../types/measurement'
import { TIME } from './format'

export interface PeriodOption {
  id: '6h' | '24h' | '7d' | '30d' | 'all'
  label: string
  /** Rótulo usado em frases: "nas últimas 6 horas". */
  phrase: string
  durationMs: number | null
}

const PERIODS: readonly PeriodOption[] = [
  { id: '6h', label: '6 h', phrase: 'nas últimas 6 horas', durationMs: 6 * TIME.HOUR },
  { id: '24h', label: '24 h', phrase: 'nas últimas 24 horas', durationMs: TIME.DAY },
  { id: '7d', label: '7 dias', phrase: 'nos últimos 7 dias', durationMs: 7 * TIME.DAY },
  { id: '30d', label: '30 dias', phrase: 'nos últimos 30 dias', durationMs: 30 * TIME.DAY },
  { id: 'all', label: 'Tudo', phrase: 'em todo o histórico', durationMs: null },
]

/**
 * Períodos que de fato recortam os dados: só aparecem os mais curtos que o
 * intervalo coberto pelo histórico, além de "Tudo".
 */
export function availablePeriods(points: readonly TimedMeasurement[], now: Date): PeriodOption[] {
  if (points.length < 2) return PERIODS.filter((period) => period.durationMs === null)
  const coveredMs = now.getTime() - points[0].timestamp.getTime()
  return PERIODS.filter((period) => period.durationMs === null || period.durationMs < coveredMs)
}

export function filterByPeriod(points: readonly TimedMeasurement[], period: PeriodOption, now: Date): TimedMeasurement[] {
  if (period.durationMs === null) return [...points]
  const start = now.getTime() - period.durationMs
  return points.filter((point) => point.timestamp.getTime() >= start)
}

export interface Gap {
  start: number
  end: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function intervalsOf(points: readonly TimedMeasurement[]): number[] {
  const intervals: number[] = []
  for (let i = 1; i < points.length; i += 1) {
    intervals.push(points[i].timestamp.getTime() - points[i - 1].timestamp.getTime())
  }
  return intervals
}

/**
 * Tempo sem medições a partir do qual há uma lacuna: 3× o intervalo típico de
 * coleta, no mínimo 1 minuto. Com menos de 3 pontos não há como estimar o intervalo.
 */
export function gapThreshold(points: readonly TimedMeasurement[]): number | null {
  if (points.length < 3) return null
  return Math.max(median(intervalsOf(points)) * 3, TIME.MINUTE)
}

/** Intervalos sem medições entre dois pontos consecutivos. */
export function findGaps(points: readonly TimedMeasurement[]): Gap[] {
  const threshold = gapThreshold(points)
  if (threshold === null) return []
  const intervals = intervalsOf(points)
  const gaps: Gap[] = []
  intervals.forEach((interval, index) => {
    if (interval > threshold) {
      gaps.push({ start: points[index].timestamp.getTime(), end: points[index + 1].timestamp.getTime() })
    }
  })
  return gaps
}

export interface ChartRow {
  t: number
  temperature: number | null
  humidity: number | null
  /** Quantas medições o ponto representa (mais de 1 quando a série foi reduzida; 0 nas quebras de lacuna). */
  samples: number
}

export interface ChartSeries {
  rows: ChartRow[]
  gaps: Gap[]
  domain: [number, number]
}

const MAX_CHART_POINTS = 720

function averageOf(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

/** Reduz séries longas para no máximo ~720 pontos, pela média de cada faixa de tempo. */
function downsample(points: readonly TimedMeasurement[], domain: [number, number]): { rows: ChartRow[]; bucketMs: number } {
  const toRow = (point: TimedMeasurement): ChartRow => ({
    t: point.timestamp.getTime(),
    temperature: point.temperature,
    humidity: point.humidity,
    samples: 1,
  })
  if (points.length <= MAX_CHART_POINTS) return { rows: points.map(toRow), bucketMs: 0 }

  const bucketMs = (domain[1] - domain[0]) / MAX_CHART_POINTS
  const buckets = new Map<number, TimedMeasurement[]>()
  for (const point of points) {
    const index = Math.min(Math.floor((point.timestamp.getTime() - domain[0]) / bucketMs), MAX_CHART_POINTS - 1)
    const bucket = buckets.get(index)
    if (bucket) bucket.push(point)
    else buckets.set(index, [point])
  }
  const rows = [...buckets.values()].map((bucket) => ({
    t: Math.round(bucket.reduce((sum, point) => sum + point.timestamp.getTime(), 0) / bucket.length),
    temperature: averageOf(bucket.map((point) => point.temperature)),
    humidity: averageOf(bucket.map((point) => point.humidity)),
    samples: bucket.length,
  }))
  return { rows, bucketMs }
}

/**
 * Prepara as linhas do gráfico: reduz a densidade quando necessário e insere
 * uma linha vazia no meio de cada lacuna para que o traço seja interrompido.
 * Com uma janela fixa (ex.: últimas 6 horas até agora), os trechos sem
 * medições no início e no fim da janela também viram lacunas.
 */
export function buildChartSeries(points: readonly TimedMeasurement[], timeWindow: [number, number] | null = null): ChartSeries {
  if (points.length === 0) return { rows: [], gaps: [], domain: timeWindow ?? [0, 0] }
  const covered: [number, number] = [points[0].timestamp.getTime(), points[points.length - 1].timestamp.getTime()]
  const { rows, bucketMs } = downsample(points, covered)
  // Lacunas menores que duas faixas de redução não aparecem na escala do gráfico.
  const inner = findGaps(points).filter((gap) => gap.end - gap.start > bucketMs * 2)
  const breaks = inner.map((gap) => ({ t: (gap.start + gap.end) / 2, temperature: null, humidity: null, samples: 0 }))

  const edges: Gap[] = []
  const threshold = gapThreshold(points)
  if (timeWindow && threshold !== null) {
    if (covered[0] - timeWindow[0] > threshold) edges.push({ start: timeWindow[0], end: covered[0] })
    if (timeWindow[1] - covered[1] > threshold) edges.push({ start: covered[1], end: timeWindow[1] })
  }

  return {
    rows: [...rows, ...breaks].sort((a, b) => a.t - b.t),
    gaps: [...inner, ...edges].sort((a, b) => a.start - b.start),
    domain: timeWindow ?? covered,
  }
}

export interface MetricSummary {
  min: { value: number; at: Date }
  max: { value: number; at: Date }
  average: number
}

export function summarize(points: readonly TimedMeasurement[], key: MetricKey): MetricSummary | null {
  let summary: MetricSummary | null = null
  let sum = 0
  let count = 0
  for (const point of points) {
    const value = point[key]
    if (value === null) continue
    sum += value
    count += 1
    if (summary === null) {
      summary = { min: { value, at: point.timestamp }, max: { value, at: point.timestamp }, average: value }
      continue
    }
    if (value < summary.min.value) summary.min = { value, at: point.timestamp }
    if (value > summary.max.value) summary.max = { value, at: point.timestamp }
  }
  if (summary !== null) summary.average = sum / count
  return summary
}

export interface Trend {
  delta: number
  /** Janela efetivamente comparada, em ms (próxima de 1 hora). */
  windowMs: number
}

/**
 * Variação da grandeza em relação à medição mais próxima de 1 hora antes da
 * última. Só é calculada se existir uma medição entre 45 e 75 minutos antes.
 */
export function computeTrend(points: readonly TimedMeasurement[], key: MetricKey, windowMs = TIME.HOUR): Trend | null {
  const latest = [...points].reverse().find((point) => point[key] !== null)
  if (!latest) return null
  const latestValue = latest[key] as number
  const target = latest.timestamp.getTime() - windowMs
  const tolerance = windowMs / 4

  let best: TimedMeasurement | null = null
  for (const point of points) {
    if (point[key] === null || point === latest) continue
    const distance = Math.abs(point.timestamp.getTime() - target)
    if (distance > tolerance) continue
    if (best === null || distance < Math.abs(best.timestamp.getTime() - target)) best = point
  }
  if (best === null) return null
  return { delta: latestValue - (best[key] as number), windowMs: latest.timestamp.getTime() - best.timestamp.getTime() }
}

export interface ValueAxis {
  domain: [number, number]
  ticks: number[]
  /** Casas decimais necessárias para escrever as marcas. */
  fractionDigits: number
}

const VALUE_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50]

/** Eixo vertical com marcas em números redondos (15, 20, 25…) cobrindo os valores com folga. */
export function valueAxis(min: number, max: number, padding: number, clamp?: [number, number], maxTicks = 6): ValueAxis {
  let low = min - padding
  let high = max + padding
  if (clamp) {
    low = Math.max(clamp[0], low)
    high = Math.min(clamp[1], high)
  }
  const step = VALUE_STEPS.find((candidate) => Math.ceil(high / candidate) - Math.floor(low / candidate) <= maxTicks - 1) ?? 50
  let start = Math.floor(low / step) * step
  let end = Math.ceil(high / step) * step
  if (end === start) end = start + step
  if (clamp) {
    start = Math.max(clamp[0], start)
    end = Math.min(clamp[1], end)
  }
  const ticks: number[] = []
  for (let value = start; value <= end + step / 1000; value += step) ticks.push(Number(value.toFixed(2)))
  return { domain: [start, end], ticks, fractionDigits: step < 1 ? 1 : 0 }
}

const TICK_STEPS = [
  15 * TIME.MINUTE,
  30 * TIME.MINUTE,
  TIME.HOUR,
  2 * TIME.HOUR,
  3 * TIME.HOUR,
  6 * TIME.HOUR,
  12 * TIME.HOUR,
  TIME.DAY,
  2 * TIME.DAY,
  7 * TIME.DAY,
]

/** Marcas do eixo de tempo alinhadas a horas cheias / meia-noite no fuso local. */
export function timeTicks([start, end]: [number, number], maxTicks = 7): { ticks: number[]; stepMs: number } {
  const span = end - start
  if (span <= 0) return { ticks: [start], stepMs: TIME.HOUR }
  const stepMs = TICK_STEPS.find((step) => span / step <= maxTicks - 1) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const midnight = new Date(start)
  midnight.setHours(0, 0, 0, 0)
  let tick = midnight.getTime() + Math.ceil((start - midnight.getTime()) / stepMs) * stepMs
  const ticks: number[] = []
  while (tick <= end) {
    ticks.push(tick)
    tick += stepMs
  }
  return { ticks, stepMs }
}
