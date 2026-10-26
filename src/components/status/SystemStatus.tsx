import { Activity, Clock3, Cpu, Database, Gauge, PlugZap, Server, Timer, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { appConfig } from '../../config/env'
import type { ConnectionState, HistoryResult } from '../../types/api'
import type { Measurement } from '../../types/measurement'
import { formatCalendarDateTime, formatDuration, formatNumber, formatRelative, formatTime } from '../../utils/format'
import type { Freshness } from '../../utils/freshness'
import { Panel } from '../ui/Panel'
import { ConnectionDot } from './ConnectionBadge'
import { CONNECTION_COPY } from './connectionCopy'

interface SystemStatusProps {
  connection: ConnectionState
  lastSuccessAt: Date | null
  lastAttemptAt: Date | null
  latest: Measurement | null
  history: HistoryResult | null
  freshness: Freshness
  hasSnapshot: boolean
  now: Date
  className?: string
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-3">
      <dt className="flex items-start gap-3 text-sm text-ink-muted sm:w-52 sm:shrink-0">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 pl-7 text-sm font-medium text-ink sm:pl-0">{children}</dd>
    </div>
  )
}

function apiHost(): string {
  if (appConfig.apiBaseUrl === null) return 'Não configurado'
  try {
    return new URL(appConfig.apiBaseUrl).host
  } catch {
    return appConfig.apiBaseUrl
  }
}

function historyText(history: HistoryResult | null): string {
  if (appConfig.historyPath === null) return 'Não configurado'
  if (history === null) return 'Aguardando consulta'
  if (history.status === 'error') return 'Falha na última consulta'
  if (history.status === 'ok') {
    const count = history.points.length
    const total = `${formatNumber(count, 0)} ${count === 1 ? 'medição' : 'medições'}`
    if (history.discarded === 0) return total
    return `${total} (${formatNumber(history.discarded, 0)} ignoradas: sem horário válido ou repetidas)`
  }
  return 'Não configurado'
}

function freshnessText(freshness: Freshness, latest: Measurement | null, hasSnapshot: boolean): string {
  if (!hasSnapshot || latest === null) return 'Sem leituras para avaliar'
  if (freshness.kind === 'unknown') return 'Não é possível avaliar: a API não informa o horário'
  if (freshness.kind === 'stale') return `Desatualizadas (limite de ${formatDuration(appConfig.staleAfterMs)})`
  return 'Em dia'
}

export function SystemStatus({ connection, lastSuccessAt, lastAttemptAt, latest, history, freshness, hasSnapshot, now, className = '' }: SystemStatusProps) {
  const failedAfterSuccess = lastAttemptAt !== null && lastSuccessAt !== null && lastAttemptAt > lastSuccessAt

  return (
    <Panel id="status" title="Status do sistema" icon={Activity} description="Situação da comunicação entre o painel e a API." className={className}>
      <dl className="divide-y divide-line">
        <Row icon={PlugZap} label="Conexão com a API">
          <span className="inline-flex items-center gap-2">
            <ConnectionDot state={connection} />
            {CONNECTION_COPY[connection].label}
          </span>
        </Row>
        <Row icon={Server} label="Servidor">
          <span className="break-all">{apiHost()}</span>
        </Row>
        <Row icon={Clock3} label="Última consulta">
          {lastSuccessAt ? (
            <span className="tabular">
              {formatTime(lastSuccessAt, true)} <span className="font-normal text-ink-muted">({formatRelative(lastSuccessAt, now)})</span>
              {failedAfterSuccess && <span className="block font-normal text-danger">Última tentativa falhou às {formatTime(lastAttemptAt, true)}</span>}
            </span>
          ) : (
            <span className="text-ink-soft">{lastAttemptAt ? `Falhou às ${formatTime(lastAttemptAt, true)}` : 'Nenhuma ainda'}</span>
          )}
        </Row>
        <Row icon={Cpu} label="Última leitura dos sensores">
          {latest?.timestamp ? (
            <span className="tabular">
              {formatCalendarDateTime(latest.timestamp, now)}{' '}
              <span className="font-normal text-ink-muted">({formatRelative(latest.timestamp, now)})</span>
            </span>
          ) : (
            <span className="text-ink-soft">{latest ? 'Horário não informado' : 'Sem leituras'}</span>
          )}
        </Row>
        <Row icon={Gauge} label="Situação das leituras">
          <span className={freshness.kind === 'stale' && latest ? 'text-warn' : ''}>{freshnessText(freshness, latest, hasSnapshot)}</span>
        </Row>
        <Row icon={Database} label="Histórico">
          {historyText(history)}
        </Row>
        <Row icon={Timer} label="Atualização automática">
          {appConfig.refreshIntervalMs > 0 ? `A cada ${formatDuration(appConfig.refreshIntervalMs)}` : 'Desativada'}
        </Row>
      </dl>
      <p className="mt-5 rounded-xl bg-sunken px-4 py-3 text-xs leading-relaxed text-ink-muted">
        A conexão indica apenas se a API respondeu. Ela não confirma que o Raspberry Pi está ligado: o melhor indício disso é a idade da
        última leitura.
      </p>
    </Panel>
  )
}
