import { CircleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface SectionBoundaryProps {
  /** Nome da seção, usado na mensagem: "o histórico", "as leituras atuais". */
  name: string
  className?: string
  children: ReactNode
}

interface SectionBoundaryState {
  failed: boolean
}

/** Isola falhas de renderização: uma seção com problema não apaga o restante do painel. */
export class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = { failed: false }

  static getDerivedStateFromError(): SectionBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Falha ao exibir ${this.props.name}:`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className={`flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-wash p-5 ${this.props.className ?? ''}`}>
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-ink">Não foi possível exibir {this.props.name}</p>
          <p className="mt-1 text-ink-soft">O restante do painel continua funcionando. Recarregue a página para tentar de novo.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex h-9 items-center rounded-full border border-ink/15 bg-surface px-4 font-semibold text-ink hover:border-ink/40"
          >
            Recarregar a página
          </button>
        </div>
      </div>
    )
  }
}
