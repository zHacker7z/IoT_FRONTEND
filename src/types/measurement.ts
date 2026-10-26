/**
 * Modelo interno de uma medição, independente do formato JSON da API.
 * Temperatura em °C e umidade relativa em %. `null` significa que o valor
 * não veio na resposta ou estava fora da faixa plausível do sensor.
 */
export interface Measurement {
  temperature: number | null
  humidity: number | null
  timestamp: Date | null
}

/** Medição com horário conhecido — requisito para aparecer no histórico. */
export interface TimedMeasurement extends Measurement {
  timestamp: Date
}

export type MetricKey = 'temperature' | 'humidity'

/** Nomes de campos definidos por variável de ambiente (aceitam caminho com ponto, ex.: `dados.temp`). */
export interface FieldOverrides {
  temperature: string | null
  humidity: string | null
  timestamp: string | null
}
