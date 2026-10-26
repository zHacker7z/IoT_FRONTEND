interface SkeletonProps {
  className?: string
}

/** Bloco de carregamento. Decorativo: o estado é anunciado por quem o usa. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <span aria-hidden="true" className={`block animate-shimmer rounded-md bg-line/70 ${className}`} />
}
