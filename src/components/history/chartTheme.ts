import type { MetricKey } from '../../types/measurement'
import { formatHumidity, formatNumber, formatTemperature } from '../../utils/format'

/** Cores em hexadecimal: atributos SVG do Recharts não resolvem variáveis CSS em todos os navegadores. */
export const CHART_COLORS = {
  grid: '#e1e8e6',
  axis: '#b8c5c2',
  tick: '#5b6c72',
  cursor: '#5b6c72',
  gapFill: '#f4f7f6',
  gapStroke: '#c9d4d1',
} as const

export interface MetricChartConfig {
  metric: MetricKey
  title: string
  unitLabel: string
  color: string
  /** Formata valores no texto (dicas e resumos). */
  format: (value: number) => string
  /** Formata as marcas do eixo vertical, já com unidade. */
  formatTick: (value: number, fractionDigits: number) => string
  /** Folga acima e abaixo dos valores medidos. */
  axisPadding: number
  /** Limites físicos do eixo, quando existem. */
  axisClamp?: [number, number]
}

export const METRIC_CHARTS: Record<MetricKey, MetricChartConfig> = {
  temperature: {
    metric: 'temperature',
    title: 'Temperatura',
    unitLabel: '°C',
    color: '#c7711a',
    format: formatTemperature,
    formatTick: (value, digits) => `${formatNumber(value, digits)} °C`,
    axisPadding: 1,
  },
  humidity: {
    metric: 'humidity',
    title: 'Umidade relativa do ar',
    unitLabel: '%',
    color: '#1b7f8e',
    format: formatHumidity,
    formatTick: (value, digits) => `${formatNumber(value, digits)}%`,
    axisPadding: 4,
    axisClamp: [0, 100],
  },
}
