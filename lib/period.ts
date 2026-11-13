// Filtro de período único da página do painel (ano e mês), usado pelos
// cartões do topo e por todas as abas.
import { MONTHS } from "@/lib/format"

/** Anos (do mais novo ao mais velho) e meses do ano escolhido (0–11, em ordem). */
export function periodOptions(items: { date: string }[], year: number | null) {
  const years = new Set<number>()
  const months = new Set<number>()
  for (const { date } of items) {
    const d = new Date(date + "T00:00:00")
    years.add(d.getFullYear())
    if (year === null || d.getFullYear() === year) months.add(d.getMonth())
  }
  return {
    years: [...years].sort((a, b) => b - a),
    months: [...months].sort((a, b) => a - b),
  }
}

/** Texto do período ativo, ou undefined sem filtro. */
export function periodLabel(year: number | null, month: number | null): string | undefined {
  if (year === null && month === null) return undefined
  if (year !== null && month !== null) return `${MONTHS[month]}/${year}`
  if (year !== null) return String(year)
  return `${MONTHS[month as number]} (todos os anos)`
}
