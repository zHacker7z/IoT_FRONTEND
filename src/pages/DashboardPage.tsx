import { appConfig } from '../config/env'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { HistorySection } from '../components/history/HistorySection'
import { CurrentReadings } from '../components/readings/CurrentReadings'
import type { ReadingState } from '../components/readings/ReadingGauge'
import { StatusNotice } from '../components/status/StatusNotice'
import { SystemStatus } from '../components/status/SystemStatus'
import { SectionBoundary } from '../components/ui/SectionBoundary'
import { WeatherSection } from '../components/weather/WeatherSection'
import { useEnvironmentData } from '../hooks/useEnvironmentData'
import { useNow } from '../hooks/useNow'
import type { TimedMeasurement } from '../types/measurement'
import { getFreshness } from '../utils/freshness'

const NO_POINTS: TimedMeasurement[] = []

export function DashboardPage() {
  const data = useEnvironmentData()
  const now = useNow()

  const snapshot = data.snapshot
  const latest = snapshot?.latest ?? null
  const history = snapshot?.history ?? null
  const historyPoints = history?.status === 'ok' ? history.points : NO_POINTS
  const freshness = getFreshness(latest, now, appConfig.staleAfterMs)
  const isEmpty = snapshot !== null && latest === null

  let readingState: ReadingState = 'unavailable'
  let emptyMessage = 'Não foi possível obter a leitura.'
  if (!data.isConfigured) {
    emptyMessage = 'Aguardando a conexão com a API.'
  } else if (data.isLoading) {
    readingState = 'loading'
  } else if (isEmpty) {
    emptyMessage = 'A API ainda não tem medições registradas.'
  } else if (latest !== null) {
    readingState = 'ready'
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
      <a
        href="#conteudo"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <Header
        connection={data.connection}
        latest={latest}
        hasData={snapshot !== null}
        now={now}
        canRefresh={data.isConfigured}
        isRefreshing={data.isRefreshing}
        isManualRefresh={data.isManualRefresh}
        onRefresh={data.refresh}
      />

      <main id="conteudo" className="flex flex-col gap-6 sm:gap-8">
        <StatusNotice
          isConfigured={data.isConfigured}
          error={data.error}
          hasSnapshot={snapshot !== null}
          lastSuccessAt={snapshot?.receivedAt ?? null}
          isEmpty={isEmpty}
          freshness={freshness}
          staleAfterMs={appConfig.staleAfterMs}
          now={now}
          isRefreshing={data.isRefreshing}
          onRetry={data.refresh}
        />

        <SectionBoundary name="as leituras atuais">
          <CurrentReadings
            state={readingState}
            latest={latest}
            history={historyPoints}
            freshness={freshness}
            emptyMessage={emptyMessage}
            now={now}
          />
        </SectionBoundary>

        <SectionBoundary name="o histórico das medições">
          <HistorySection
            history={history}
            isConfigured={data.isConfigured}
            isLoading={data.isLoading}
            isRefreshing={data.isRefreshing}
            now={now}
            onRetry={data.refresh}
          />
        </SectionBoundary>

        <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-12">
          <WeatherSection className="lg:col-span-6" />
          <SectionBoundary name="o status do sistema" className="lg:col-span-6">
            <SystemStatus
              className="lg:col-span-6"
              connection={data.connection}
              lastSuccessAt={snapshot?.receivedAt ?? null}
              lastAttemptAt={data.lastAttemptAt}
              latest={latest}
              history={history}
              freshness={freshness}
              hasSnapshot={snapshot !== null}
              now={now}
            />
          </SectionBoundary>
        </div>
      </main>

      <Footer />
    </div>
  )
}
