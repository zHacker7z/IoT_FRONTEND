import { useEffect, useState } from 'react'

/** Relógio do navegador para textos relativos ("há 3 minutos") e detecção de dados desatualizados. */
export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
