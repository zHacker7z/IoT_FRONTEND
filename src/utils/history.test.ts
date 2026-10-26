import { describe, expect, it } from 'vitest'
import type { TimedMeasurement } from '../types/measurement'
import { TIME } from './format'
import { availablePeriods, buildChartSeries, computeTrend, filterByPeriod, findGaps, summarize, timeTicks } from './history'

const start = new Date('2026-10-23T00:00:00Z').getTime()

function series(minutes: number[], values: (minute: number) => number = (minute) => 20 + minute / 60): TimedMeasurement[] {
  return minutes.map((minute) => ({
    timestamp: new Date(start + minute * TIME.MINUTE),
    temperature: values(minute),
    humidity: 50,
  }))
}

const everyFiveMinutes = (from: number, to: number) => Array.from({ length: (to - from) / 5 + 1 }, (_, index) => from + index * 5)

describe('findGaps', () => {
  it('encontra lacunas maiores que 3× o intervalo típico', () => {
    const points = series([...everyFiveMinutes(0, 60), ...everyFiveMinutes(180, 240)])
    expect(findGaps(points)).toEqual([{ start: start + 60 * TIME.MINUTE, end: start + 180 * TIME.MINUTE }])
  })

  it('não acusa lacunas em séries regulares ou curtas', () => {
    expect(findGaps(series(everyFiveMinutes(0, 120)))).toEqual([])
    expect(findGaps(series([0, 500]))).toEqual([])
  })
})

describe('buildChartSeries', () => {
  it('insere uma linha vazia no meio de cada lacuna para interromper o traço', () => {
    const points = series([0, 5, 10, 15, 120, 125, 130])
    const { rows, gaps } = buildChartSeries(points)
    expect(gaps).toHaveLength(1)
    const breakRow = rows.find((row) => row.samples === 0)
    expect(breakRow).toMatchObject({ temperature: null, humidity: null })
    expect(breakRow?.t).toBe(start + 67.5 * TIME.MINUTE)
  })

  it('reduz séries longas pela média sem perder o total de medições', () => {
    const points = series(Array.from({ length: 3000 }, (_, index) => index))
    const { rows } = buildChartSeries(points)
    expect(rows.length).toBeLessThanOrEqual(720)
    expect(rows.reduce((sum, row) => sum + row.samples, 0)).toBe(3000)
  })
})

describe('summarize', () => {
  it('calcula mínima, máxima e média ignorando valores ausentes', () => {
    const points: TimedMeasurement[] = [
      { timestamp: new Date(start), temperature: 18, humidity: null },
      { timestamp: new Date(start + TIME.HOUR), temperature: null, humidity: 40 },
      { timestamp: new Date(start + 2 * TIME.HOUR), temperature: 24, humidity: 60 },
    ]
    expect(summarize(points, 'temperature')).toMatchObject({ min: { value: 18 }, max: { value: 24 }, average: 21 })
    expect(summarize(points, 'humidity')?.average).toBe(50)
    expect(summarize([], 'temperature')).toBeNull()
  })
})

describe('computeTrend', () => {
  it('compara com a medição de cerca de 1 hora antes', () => {
    const trend = computeTrend(series(everyFiveMinutes(0, 120)), 'temperature')
    expect(trend?.delta).toBeCloseTo(1)
    expect(trend?.windowMs).toBe(TIME.HOUR)
  })

  it('não calcula tendência sem medição próxima de 1 hora antes', () => {
    expect(computeTrend(series([0, 5, 10]), 'temperature')).toBeNull()
  })
})

describe('períodos', () => {
  it('oferece apenas períodos menores que o intervalo coberto pelos dados', () => {
    const now = new Date(start + 30 * TIME.HOUR)
    const points = series([0, 60])
    expect(availablePeriods(points, now).map((period) => period.id)).toEqual(['6h', '24h', 'all'])
  })

  it('filtra pelo horário atual', () => {
    const now = new Date(start + 10 * TIME.HOUR)
    const [sixHours] = availablePeriods(series([0, 60]), now)
    const visible = filterByPeriod(series(everyFiveMinutes(0, 600)), sixHours, now)
    expect(visible[0].timestamp.getTime()).toBe(start + 4 * TIME.HOUR)
  })
})

describe('timeTicks', () => {
  it('gera marcas em horários redondos', () => {
    const { ticks, stepMs } = timeTicks([start + 7 * TIME.MINUTE, start + 6 * TIME.HOUR])
    expect(ticks.length).toBeLessThanOrEqual(7)
    for (const tick of ticks) expect(new Date(tick).getMinutes()).toBe(0)
    expect(stepMs).toBe(TIME.HOUR)
  })
})

describe('buildChartSeries com janela fixa', () => {
  it('marca como lacuna o trecho sem medições até o horário atual', () => {
    const points = series(everyFiveMinutes(0, 180))
    const windowEnd = start + 6 * TIME.HOUR
    const { gaps, domain } = buildChartSeries(points, [start, windowEnd])
    expect(domain).toEqual([start, windowEnd])
    expect(gaps).toEqual([{ start: start + 180 * TIME.MINUTE, end: windowEnd }])
  })

  it('não marca lacuna quando a última medição é recente', () => {
    const points = series(everyFiveMinutes(0, 180))
    const { gaps } = buildChartSeries(points, [start, start + 182 * TIME.MINUTE])
    expect(gaps).toEqual([])
  })
})
