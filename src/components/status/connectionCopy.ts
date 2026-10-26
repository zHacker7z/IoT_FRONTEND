import type { ConnectionState } from '../../types/api'

export const CONNECTION_COPY: Record<ConnectionState, { label: string; dot: string; frame: string }> = {
  online: { label: 'API conectada', dot: 'bg-ok', frame: 'border-ok/25 bg-ok-wash text-ok' },
  degraded: { label: 'API com erro', dot: 'bg-warn', frame: 'border-warn/30 bg-warn-wash text-warn' },
  offline: { label: 'API sem resposta', dot: 'bg-danger', frame: 'border-danger/25 bg-danger-wash text-danger' },
  checking: { label: 'Conectando à API', dot: 'bg-ink-muted animate-shimmer', frame: 'border-line bg-surface text-ink-soft' },
  'not-configured': { label: 'API não configurada', dot: 'bg-line-strong', frame: 'border-line bg-surface text-ink-muted' },
}
