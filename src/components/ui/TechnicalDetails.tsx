import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface TechnicalDetailsProps {
  summary?: string
  children: ReactNode
}

/** Diagnóstico recolhido por padrão, para não poluir a tela de quem só quer ver os dados. */
export function TechnicalDetails({ summary = 'Detalhes técnicos', children }: TechnicalDetailsProps) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md font-medium text-ink-soft underline decoration-line-strong underline-offset-4 hover:decoration-ink [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 max-w-[72ch] space-y-1.5 leading-relaxed text-ink-muted">{children}</div>
    </details>
  )
}
