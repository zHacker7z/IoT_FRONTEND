import type { ConnectionState } from '../../types/api'
import { CONNECTION_COPY } from './connectionCopy'

export function ConnectionDot({ state }: { state: ConnectionState }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${CONNECTION_COPY[state].dot}`} />
}

/** Indica se a API respondeu à última consulta — não se o Raspberry Pi está ligado. */
export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const copy = CONNECTION_COPY[state]
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${copy.frame}`}
      title="Mostra se a API respondeu à consulta mais recente."
    >
      <ConnectionDot state={state} />
      {copy.label}
    </span>
  )
}
