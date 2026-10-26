import type { Measurement } from '../types/measurement'

export type Freshness =
  | { kind: 'fresh'; ageMs: number }
  | { kind: 'stale'; ageMs: number }
  /** A API não informou o horário da medição: não dá para saber se está em dia. */
  | { kind: 'unknown' }

export function getFreshness(measurement: Measurement | null, now: Date, staleAfterMs: number): Freshness {
  if (measurement?.timestamp == null) return { kind: 'unknown' }
  // Relógios do sensor e do navegador podem divergir um pouco; idade negativa vira zero.
  const ageMs = Math.max(0, now.getTime() - measurement.timestamp.getTime())
  return ageMs > staleAfterMs ? { kind: 'stale', ageMs } : { kind: 'fresh', ageMs }
}
