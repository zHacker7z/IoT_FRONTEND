import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PanelProps {
  id: string
  title: string
  icon?: LucideIcon
  description?: ReactNode
  actions?: ReactNode
  /** `pending`: borda tracejada para seções que aguardam uma fonte de dados. */
  variant?: 'default' | 'pending'
  className?: string
  children: ReactNode
}

export function Panel({ id, title, icon: Icon, description, actions, variant = 'default', className = '', children }: PanelProps) {
  const frame =
    variant === 'pending' ? 'border border-dashed border-line-strong bg-sunken' : 'border border-line bg-surface'
  return (
    <section aria-labelledby={`${id}-title`} className={`rounded-2xl ${frame} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-ink-soft" aria-hidden="true">
              <Icon className="size-[18px]" strokeWidth={1.8} />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="wide text-lg font-semibold leading-tight tracking-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-pretty text-ink-muted">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  )
}
