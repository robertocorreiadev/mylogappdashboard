import { Skeleton } from "@/components/ui/skeleton"

/** Esqueleto das telas de painel enquanto o servidor busca os dados. */
export function PageSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8" aria-busy="true">
      <span className="sr-only" role="status">Carregando…</span>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      {cards > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      <Skeleton className="mb-4 h-9 w-full max-w-md" />
      <Skeleton className="h-72 w-full" />
    </main>
  )
}
