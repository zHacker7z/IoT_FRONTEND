import { CloudOff, CloudSun } from 'lucide-react'
import { Panel } from '../ui/Panel'
import { TechnicalDetails } from '../ui/TechnicalDetails'

/**
 * Seção reservada para a previsão do tempo. Nenhuma fonte meteorológica foi
 * fornecida pelo backend, então a seção explica a ausência em vez de simular dados.
 */
export function WeatherSection({ className = '' }: { className?: string }) {
  return (
    <Panel
      id="previsao"
      title="Previsão do tempo"
      icon={CloudSun}
      description="Condições meteorológicas da região, separadas das leituras dos sensores."
      variant="pending"
      className={className}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-dashed border-line-strong text-ink-muted" aria-hidden="true">
          <CloudOff className="size-6" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">A previsão do tempo ainda não está disponível neste painel</p>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-muted">
            A API do projeto não fornece dados meteorológicos e nenhuma fonte externa foi conectada. Todas as informações desta página vêm dos
            sensores.
          </p>
          <TechnicalDetails summary="O que é necessário para ativar">
            <ul className="list-disc space-y-1 pl-5">
              <li>Um endpoint de previsão no backend do projeto.</li>
            </ul>
          </TechnicalDetails>
        </div>
      </div>
    </Panel>
  )
}
