import { ZONE_COLORS, type ScaleZone } from '../../config/references'

interface InstrumentScaleProps {
  min: number
  max: number
  ticks: readonly number[]
  value: number | null
  /** Fundo da régua (gradiente CSS). */
  track: string
  zones?: readonly ScaleZone[]
  /** Faixa percorrida pela grandeza num período recente (mínima e máxima medidas). */
  range?: { min: number; max: number } | null
  formatTick: (value: number) => string
  label: string
  valueText: string | null
}

function percent(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

/**
 * Régua horizontal de instrumento com ponteiro. O ponteiro entra varrendo a
 * escala na primeira leitura e desliza quando o valor muda.
 */
export function InstrumentScale({ min, max, ticks, value, track, zones = [], range = null, formatTick, label, valueText }: InstrumentScaleProps) {
  const position = value === null ? null : percent(value, min, max)
  const outOfRange = value !== null && (value < min || value > max)
  const meterProps =
    value === null
      ? { role: 'img', 'aria-label': `${label}: sem leitura` }
      : { role: 'meter', 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-valuetext': valueText ?? undefined }

  return (
    <div {...meterProps} className="relative select-none pt-3">
      <div className="relative h-2.5 overflow-hidden rounded-full" style={{ background: track }}>
        {zones.map((zone) => (
          <span
            key={zone.label}
            className="absolute inset-y-0"
            style={{
              left: `${percent(zone.from, min, max)}%`,
              width: `${percent(zone.to, min, max) - percent(zone.from, min, max)}%`,
              background: ZONE_COLORS[zone.tone],
            }}
          />
        ))}
        {ticks.slice(1, -1).map((tick) => (
          <span key={tick} className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${percent(tick, min, max)}%` }} />
        ))}
      </div>

      {range && (
        <span
          aria-hidden="true"
          className="absolute top-[9px] h-4 rounded-full border-[1.5px] border-ink/45"
          style={{
            left: `calc(${percent(range.min, min, max)}% - 3px)`,
            width: `calc(${percent(range.max, min, max) - percent(range.min, min, max)}% + 6px)`,
          }}
        />
      )}

      {position !== null && (
        <span
          className="absolute top-0 flex -translate-x-1/2 animate-sweep flex-col items-center transition-[left] duration-700 ease-instrument"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <span className="h-[22px] w-[3px] rounded-full bg-ink shadow-[0_0_0_2px_var(--color-surface)]" />
          {outOfRange && <span className="mt-0.5 text-[10px] font-semibold text-ink">{value !== null && value < min ? '◂' : '▸'}</span>}
        </span>
      )}

      <div className="relative mt-2 h-4 text-[11px] text-ink-muted" aria-hidden="true">
        {ticks.map((tick, index) => {
          const edge = index === 0 ? 'translate-x-0' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
          return (
            <span key={tick} className={`tabular absolute top-0 ${edge}`} style={{ left: `${percent(tick, min, max)}%` }}>
              {formatTick(tick)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
