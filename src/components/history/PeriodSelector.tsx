import type { PeriodOption } from '../../utils/history'

interface PeriodSelectorProps {
  options: PeriodOption[]
  value: PeriodOption['id']
  onChange: (id: PeriodOption['id']) => void
}

/** Controle segmentado com rádios nativos: setas do teclado funcionam sem código extra. */
export function PeriodSelector({ options, value, onChange }: PeriodSelectorProps) {
  return (
    <fieldset className="shrink-0">
      <legend className="sr-only">Período exibido nos gráficos</legend>
      <div className="inline-flex rounded-full border border-line bg-sunken p-1">
        {options.map((option) => (
          <label key={option.id} className="relative">
            <input
              type="radio"
              name="periodo-historico"
              value={option.id}
              checked={option.id === value}
              onChange={() => onChange(option.id)}
              className="peer sr-only"
            />
            <span className="tabular block cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
