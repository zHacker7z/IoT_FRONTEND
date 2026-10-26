import { PLAUSIBLE_RANGE } from '../config/references'
import type { FieldOverrides, Measurement, TimedMeasurement } from '../types/measurement'

/*
 * Adaptador entre o JSON da API e o modelo interno.
 *
 * O contrato da API ainda não está documentado neste repositório, então o
 * adaptador procura os nomes de campo mais comuns (português e inglês,
 * snake_case ou camelCase) e aceita respostas embrulhadas em um objeto
 * (`{ "data": [...] }`, `{ "leituras": [...] }`...). Quando o contrato real for
 * conhecido, basta definir VITE_API_FIELD_* ou ajustar as listas abaixo.
 */

type JsonRecord = Record<string, unknown>

const TEMPERATURE_KEYS = ['temperature', 'temperatura', 'temp', 'temperature_c', 'temperatura_c', 'temp_c', 'celsius']
const HUMIDITY_KEYS = [
  'humidity',
  'umidade',
  'umid',
  'hum',
  'humidity_percent',
  'umidade_relativa',
  'relative_humidity',
  'umidade_ar',
  'rh',
]
const TIMESTAMP_KEYS = [
  'timestamp',
  'measured_at',
  'recorded_at',
  'created_at',
  'data_hora',
  'datahora',
  'data_leitura',
  'datetime',
  'date_time',
  'horario',
  'date',
  'time',
  'ts',
]
/** Valores aninhados como `{ "temperatura": { "valor": 24.5 } }`. */
const VALUE_KEYS = ['value', 'valor']

const MAX_SEARCH_DEPTH = 2

export type LatestParseResult =
  | { kind: 'measurement'; measurement: Measurement }
  | { kind: 'empty' }
  | { kind: 'unrecognized' }

export type SeriesParseResult = { kind: 'series'; points: TimedMeasurement[]; discarded: number } | { kind: 'unrecognized' }

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function readPath(record: JsonRecord, path: string): unknown {
  let current: unknown = record
  for (const part of path.split('.')) {
    if (!isRecord(current)) return undefined
    current = current[part]
  }
  return current
}

function pickField(record: JsonRecord, override: string | null, aliases: readonly string[]): unknown {
  if (override !== null) return readPath(record, override)
  const keysByNormalizedName = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]))
  for (const alias of aliases) {
    const key = keysByNormalizedName.get(normalizeKey(alias))
    if (key !== undefined) return record[key]
  }
  return undefined
}

function unwrapValue(value: unknown): unknown {
  if (!isRecord(value)) return value
  for (const key of VALUE_KEYS) {
    if (key in value) return value[key]
  }
  return value
}

/** Aceita número ou texto numérico, inclusive com vírgula decimal e unidade (`"24,5 °C"`). */
export function parseNumber(value: unknown): number | null {
  const raw = unwrapValue(value)
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const match = raw.trim().match(/^[-+]?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const parsed = Number(match[0].replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function withinRange(value: number | null, range: { min: number; max: number }): number | null {
  if (value === null) return null
  return value >= range.min && value <= range.max ? value : null
}

function dateFromEpoch(value: number): Date | null {
  if (value > 1e12) return new Date(value)
  if (value > 1e9) return new Date(value * 1000)
  return null
}

const BRAZILIAN_DATE = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
const ISO_WITH_SPACE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/

/**
 * Converte o horário da medição. Datas sem fuso (ex.: `2026-10-23 14:31:00`)
 * são interpretadas no fuso do navegador.
 */
export function parseTimestamp(value: unknown): Date | null {
  const raw = unwrapValue(value)
  let date: Date | null = null

  if (typeof raw === 'number') {
    date = dateFromEpoch(raw)
  } else if (typeof raw === 'string') {
    const text = raw.trim()
    const brazilian = text.match(BRAZILIAN_DATE)
    if (/^\d+(?:\.\d+)?$/.test(text)) {
      date = dateFromEpoch(Number(text))
    } else if (brazilian) {
      const [, day, month, year, hour = '0', minute = '0', second = '0'] = brazilian
      date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    } else {
      date = new Date(text.replace(ISO_WITH_SPACE, '$1T$2'))
    }
  }

  if (date === null || Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  return year >= 2000 && year <= 2100 ? date : null
}

/** Converte um objeto da API em medição. Retorna `null` se não houver temperatura nem umidade. */
export function normalizeMeasurement(raw: unknown, fields: FieldOverrides): Measurement | null {
  if (!isRecord(raw)) return null
  const temperatureRaw = pickField(raw, fields.temperature, TEMPERATURE_KEYS)
  const humidityRaw = pickField(raw, fields.humidity, HUMIDITY_KEYS)
  if (temperatureRaw === undefined && humidityRaw === undefined) return null

  return {
    temperature: withinRange(parseNumber(temperatureRaw), PLAUSIBLE_RANGE.temperature),
    humidity: withinRange(parseNumber(humidityRaw), PLAUSIBLE_RANGE.humidity),
    timestamp: parseTimestamp(pickField(raw, fields.timestamp, TIMESTAMP_KEYS)),
  }
}

/** Procura, em até dois níveis de objetos, a primeira lista ou o primeiro objeto que pareça uma medição. */
function findNested<T>(raw: unknown, visit: (candidate: unknown) => T | null, depth = 0): T | null {
  const direct = visit(raw)
  if (direct !== null) return direct
  if (!isRecord(raw) || depth >= MAX_SEARCH_DEPTH) return null
  for (const value of Object.values(raw)) {
    if (typeof value !== 'object' || value === null) continue
    const nested = findNested(value, visit, depth + 1)
    if (nested !== null) return nested
  }
  return null
}

function isEmptyPayload(raw: unknown, depth = 0): boolean {
  if (raw === null || raw === undefined) return true
  if (Array.isArray(raw)) return raw.length === 0
  if (!isRecord(raw)) return false
  const values = Object.values(raw)
  if (values.length === 0) return true
  if (depth >= MAX_SEARCH_DEPTH) return false
  // `{ "data": [] }` ou `{ "data": null, "message": "..." }`: nenhum valor estruturado com conteúdo.
  const structured = values.filter((value) => typeof value === 'object')
  return structured.length > 0 && structured.every((value) => isEmptyPayload(value, depth + 1))
}

function newest(measurements: Measurement[]): Measurement {
  return measurements.reduce((latest, current) => {
    if (current.timestamp === null) return latest
    if (latest.timestamp === null || current.timestamp > latest.timestamp) return current
    return latest
  })
}

/** Interpreta a resposta do endpoint de leitura atual (objeto, lista ou objeto embrulhado). */
export function parseLatestResponse(raw: unknown, fields: FieldOverrides): LatestParseResult {
  const found = findNested(raw, (candidate) => {
    if (Array.isArray(candidate)) {
      const measurements = candidate
        .map((item) => normalizeMeasurement(item, fields))
        .filter((item): item is Measurement => item !== null)
      return measurements.length > 0 ? newest(measurements) : null
    }
    return normalizeMeasurement(candidate, fields)
  })
  if (found !== null) return { kind: 'measurement', measurement: found }
  return isEmptyPayload(raw) ? { kind: 'empty' } : { kind: 'unrecognized' }
}

/** Interpreta a resposta do endpoint de histórico. Pontos sem horário são descartados. */
export function parseSeriesResponse(raw: unknown, fields: FieldOverrides): SeriesParseResult {
  if (isEmptyPayload(raw)) return { kind: 'series', points: [], discarded: 0 }

  const list = findNested(raw, (candidate) => {
    if (!Array.isArray(candidate) || candidate.length === 0) return null
    const measurements = candidate.map((item) => normalizeMeasurement(item, fields))
    return measurements.some((item) => item !== null) ? measurements : null
  })
  if (list === null) return { kind: 'unrecognized' }

  const byTime = new Map<number, TimedMeasurement>()
  for (const item of list) {
    if (item?.timestamp) byTime.set(item.timestamp.getTime(), { ...item, timestamp: item.timestamp })
  }
  const points = [...byTime.values()].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  return { kind: 'series', points, discarded: list.length - points.length }
}
