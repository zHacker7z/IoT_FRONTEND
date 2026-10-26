import { describe, expect, it } from 'vitest'
import type { FieldOverrides } from '../types/measurement'
import { normalizeMeasurement, parseLatestResponse, parseNumber, parseSeriesResponse, parseTimestamp } from './normalizers'

const noOverrides: FieldOverrides = { temperature: null, humidity: null, timestamp: null }

describe('parseNumber', () => {
  it('aceita números, vírgula decimal e unidade junto do valor', () => {
    expect(parseNumber(24.5)).toBe(24.5)
    expect(parseNumber('24,5')).toBe(24.5)
    expect(parseNumber('58 %')).toBe(58)
    expect(parseNumber('-3.2 °C')).toBe(-3.2)
    expect(parseNumber({ valor: '21.4' })).toBe(21.4)
  })

  it('rejeita valores ausentes ou não numéricos', () => {
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('erro')).toBeNull()
    expect(parseNumber(Number.NaN)).toBeNull()
  })
})

describe('parseTimestamp', () => {
  it('interpreta ISO 8601 com e sem fuso', () => {
    expect(parseTimestamp('2026-10-23T14:31:00Z')?.toISOString()).toBe('2026-10-23T14:31:00.000Z')
    const local = parseTimestamp('2026-10-23 14:31:00')
    expect(local?.getHours()).toBe(14)
    expect(local?.getMinutes()).toBe(31)
  })

  it('interpreta epoch em segundos e em milissegundos', () => {
    const ms = Date.UTC(2026, 9, 23, 14, 31)
    expect(parseTimestamp(ms)?.getTime()).toBe(ms)
    expect(parseTimestamp(ms / 1000)?.getTime()).toBe(ms)
    expect(parseTimestamp(String(ms / 1000))?.getTime()).toBe(ms)
  })

  it('interpreta data no formato brasileiro', () => {
    const date = parseTimestamp('23/10/2026 14:31:05')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(23)
    expect(date?.getSeconds()).toBe(5)
  })

  it('rejeita datas inválidas ou implausíveis', () => {
    expect(parseTimestamp('ontem')).toBeNull()
    expect(parseTimestamp(42)).toBeNull()
    expect(parseTimestamp(undefined)).toBeNull()
  })
})

describe('normalizeMeasurement', () => {
  it('reconhece nomes em português, inglês, snake_case e camelCase', () => {
    expect(normalizeMeasurement({ temperatura: 24.5, umidade: 60, data_hora: '2026-10-23T10:00:00Z' }, noOverrides)).toEqual({
      temperature: 24.5,
      humidity: 60,
      timestamp: new Date('2026-10-23T10:00:00Z'),
    })
    expect(normalizeMeasurement({ Temperature: '22,1', Humidity: '48', createdAt: '2026-10-23T10:00:00Z' }, noOverrides)).toMatchObject({
      temperature: 22.1,
      humidity: 48,
    })
  })

  it('usa os campos definidos por variável de ambiente, inclusive aninhados', () => {
    const fields: FieldOverrides = { temperature: 'sensores.t', humidity: 'sensores.h', timestamp: 'quando' }
    expect(normalizeMeasurement({ sensores: { t: 19, h: 77 }, quando: 1792764660 }, fields)).toMatchObject({
      temperature: 19,
      humidity: 77,
    })
  })

  it('descarta valores fora da faixa física sem inventar substitutos', () => {
    expect(normalizeMeasurement({ temperatura: -999, umidade: 140 }, noOverrides)).toEqual({
      temperature: null,
      humidity: null,
      timestamp: null,
    })
  })

  it('não trata objetos sem temperatura nem umidade como medição', () => {
    expect(normalizeMeasurement({ status: 'ok' }, noOverrides)).toBeNull()
    expect(normalizeMeasurement([1, 2], noOverrides)).toBeNull()
  })
})

describe('parseLatestResponse', () => {
  it('aceita objeto direto ou embrulhado', () => {
    expect(parseLatestResponse({ temperatura: 25 }, noOverrides)).toMatchObject({ kind: 'measurement' })
    expect(parseLatestResponse({ data: { temperature: 25, humidity: 50 } }, noOverrides)).toMatchObject({
      kind: 'measurement',
      measurement: { temperature: 25, humidity: 50 },
    })
  })

  it('escolhe a medição mais recente quando recebe uma lista', () => {
    const result = parseLatestResponse(
      [
        { temperatura: 20, timestamp: '2026-10-23T10:00:00Z' },
        { temperatura: 23, timestamp: '2026-10-23T12:00:00Z' },
        { temperatura: 21, timestamp: '2026-10-23T11:00:00Z' },
      ],
      noOverrides,
    )
    expect(result).toMatchObject({ kind: 'measurement', measurement: { temperature: 23 } })
  })

  it('diferencia resposta vazia de formato desconhecido', () => {
    expect(parseLatestResponse(null, noOverrides)).toEqual({ kind: 'empty' })
    expect(parseLatestResponse([], noOverrides)).toEqual({ kind: 'empty' })
    expect(parseLatestResponse({ data: [] }, noOverrides)).toEqual({ kind: 'empty' })
    expect(parseLatestResponse({ mensagem: 'olá' }, noOverrides)).toEqual({ kind: 'unrecognized' })
  })
})

describe('parseSeriesResponse', () => {
  it('ordena, remove duplicatas e descarta pontos sem horário', () => {
    const result = parseSeriesResponse(
      {
        leituras: [
          { temperatura: 22, timestamp: '2026-10-23T12:00:00Z' },
          { temperatura: 20, timestamp: '2026-10-23T10:00:00Z' },
          { temperatura: 21, timestamp: '2026-10-23T10:00:00Z' },
          { temperatura: 19 },
        ],
      },
      noOverrides,
    )
    expect(result.kind).toBe('series')
    if (result.kind !== 'series') return
    expect(result.points.map((point) => point.temperature)).toEqual([21, 22])
    expect(result.discarded).toBe(2)
  })

  it('reconhece histórico vazio e formato desconhecido', () => {
    expect(parseSeriesResponse([], noOverrides)).toEqual({ kind: 'series', points: [], discarded: 0 })
    expect(parseSeriesResponse({ itens: [{ a: 1 }] }, noOverrides)).toEqual({ kind: 'unrecognized' })
  })
})
