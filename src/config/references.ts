/**
 * Faixas de referência usadas apenas para contextualizar as leituras.
 * Não são medições: servem para desenhar as escalas dos instrumentos.
 */

export interface ScaleZone {
  from: number
  to: number
  label: string
  /** Faixa como é divulgada: "abaixo de 12%", "12–20%". */
  rangeLabel: string
  tone: 'emergency' | 'alert' | 'attention'
}

export const ZONE_COLORS: Record<ScaleZone['tone'], string> = {
  emergency: '#b3261e',
  alert: '#dd7a2b',
  attention: '#e6b43a',
}

/** Escala visual do termômetro, em °C. Leituras fora dela ficam presas às bordas. */
export const TEMPERATURE_SCALE = {
  min: 0,
  max: 50,
  ticks: [0, 10, 20, 30, 40, 50],
} as const

export const HUMIDITY_SCALE = {
  min: 0,
  max: 100,
  ticks: [0, 20, 40, 60, 80, 100],
} as const

/**
 * Níveis de alerta para umidade relativa do ar adotados pela Defesa Civil:
 * 21–30% estado de atenção, 12–20% estado de alerta, abaixo de 12% estado de emergência.
 */
export const HUMIDITY_ALERT_ZONES: readonly ScaleZone[] = [
  { from: 0, to: 12, label: 'Estado de emergência', rangeLabel: 'abaixo de 12%', tone: 'emergency' },
  { from: 12, to: 20, label: 'Estado de alerta', rangeLabel: '12–20%', tone: 'alert' },
  { from: 20, to: 30, label: 'Estado de atenção', rangeLabel: '21–30%', tone: 'attention' },
]

export function humidityAlertZone(humidity: number): ScaleZone | null {
  if (humidity < 12) return HUMIDITY_ALERT_ZONES[0]
  if (humidity <= 20) return HUMIDITY_ALERT_ZONES[1]
  if (humidity <= 30) return HUMIDITY_ALERT_ZONES[2]
  return null
}

/** Limites físicos aceitos ao ler a API. Valores fora deles são tratados como leitura inválida. */
export const PLAUSIBLE_RANGE = {
  temperature: { min: -50, max: 100 },
  humidity: { min: 0, max: 100 },
} as const
