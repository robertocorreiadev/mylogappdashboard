"use client"

import { CalendarRange, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MONTHS } from "@/lib/format"
import { periodOptions } from "@/lib/period"

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10 dark:bg-input/30"

/** Filtro de período da página: vale para os cartões do topo e para todas as abas. */
export function PeriodFilter({
  items, year, month, onChange,
}: {
  /** Tudo que tem data (boletas + lançamentos), para montar as opções. */
  items: { date: string }[]
  year: number | null
  month: number | null
  onChange: (year: number | null, month: number | null) => void
}) {
  const { years, months } = periodOptions(items, year)
  const active = year !== null || month !== null

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período">
      <CalendarRange className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only text-sm text-muted-foreground sm:not-sr-only">Período</span>
      <select
        aria-label="Ano"
        className={selectClass}
        value={year ?? ""}
        onChange={(e) => {
          const y = e.target.value === "" ? null : Number(e.target.value)
          // O mês escolhido pode não existir no ano novo: some do filtro.
          const keep = month !== null && periodOptions(items, y).months.includes(month)
          onChange(y, keep ? month : null)
        }}
      >
        <option value="">Todos os anos</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        aria-label="Mês"
        className={selectClass}
        value={month ?? ""}
        onChange={(e) => onChange(year, e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">Todos os meses</option>
        {months.map((m) => <option key={m} value={m}>{MONTHS[m]}</option>)}
      </select>
      {active && (
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => onChange(null, null)}>
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Limpar
        </Button>
      )}
    </div>
  )
}
