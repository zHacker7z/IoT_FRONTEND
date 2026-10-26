import { useState, useSyncExternalStore } from 'react'
import { appConfig, configStatus } from '../config/env'
import { fetchDashboardSnapshot } from '../services/measurementService'
import { createEnvironmentStore, type EnvironmentDataState } from './environmentStore'

export type { EnvironmentDataState }

/** Dados do painel com atualização periódica. Cada componente que usa o hook tem sua própria consulta. */
export function useEnvironmentData(refreshIntervalMs: number = appConfig.refreshIntervalMs) {
  const [store] = useState(() =>
    createEnvironmentStore({
      isConfigured: configStatus.isConfigured,
      refreshIntervalMs,
      fetchSnapshot: (signal) => fetchDashboardSnapshot(signal),
    }),
  )
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return { ...state, refresh: store.refresh, isConfigured: configStatus.isConfigured }
}
