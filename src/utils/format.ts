const LOCALE = 'pt-BR'

const numberFormats = new Map<number, Intl.NumberFormat>()

export function formatNumber(value: number, fractionDigits: number): string {
  let format = numberFormats.get(fractionDigits)
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    numberFormats.set(fractionDigits, format)
  }
  // Evita "-0,0" em leituras como -0,04 °C.
  const rounded = Number(value.toFixed(fractionDigits))
  return format.format(Object.is(rounded, -0) ? 0 : rounded)
}

/** Casas decimais exibidas por grandeza, usadas em todo o painel. */
export const METRIC_DIGITS = { temperature: 1, humidity: 0 } as const

export function formatTemperature(value: number): string {
  return `${formatNumber(value, METRIC_DIGITS.temperature)} °C`
}

export function formatHumidity(value: number): string {
  return `${formatNumber(value, METRIC_DIGITS.humidity)}%`
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' })
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const timeWithSecondsFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })

export function formatTime(date: Date, withSeconds = false): string {
  return (withSeconds ? timeWithSecondsFormat : timeFormat).format(date)
}

export function formatDate(date: Date): string {
  return dateFormat.format(date)
}

export function formatShortDate(date: Date): string {
  return shortDateFormat.format(date)
}

/** "23/10/2026 às 14:31" */
export function formatDateTime(date: Date, withSeconds = false): string {
  return `${formatDate(date)} às ${formatTime(date, withSeconds)}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "hoje às 14:31", "ontem às 22:10" ou "21/10/2026 às 08:00". */
export function formatCalendarDateTime(date: Date, now: Date): string {
  if (isSameDay(date, now)) return `hoje às ${formatTime(date)}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return `ontem às ${formatTime(date)}`
  return formatDateTime(date)
}

/** Data longa usada nas dicas do gráfico: "qui., 23/10 às 14:31". */
export function formatTooltipDate(date: Date): string {
  return `${weekdayFormat.format(date)}, ${formatShortDate(date)} às ${formatTime(date)}`
}

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'always' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "há 3 minutos", "há 2 horas". Horários no futuro (relógios dessincronizados) viram "agora". */
export function formatRelative(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE) return 'agora há pouco'
  if (elapsed < HOUR) return relativeFormat.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return relativeFormat.format(-Math.floor(elapsed / HOUR), 'hour')
  return relativeFormat.format(-Math.floor(elapsed / DAY), 'day')
}

/** "15 minutos", "2 horas", "1 dia" — usado para limites e intervalos. */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) {
    const seconds = Math.round(ms / 1000)
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`
  }
  if (ms < HOUR) {
    const minutes = Math.round(ms / MINUTE)
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR)
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.round(ms / DAY)
  return `${days} ${days === 1 ? 'dia' : 'dias'}`
}

export const TIME = { MINUTE, HOUR, DAY } as const
