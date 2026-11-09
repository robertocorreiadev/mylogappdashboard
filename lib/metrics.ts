import type { DailyRecord } from "@/lib/db/schema"

type NetInput = Pick<DailyRecord, "date" | "delivered" | "valuePerDelivery" | "expenses">

/** Líquido de uma boleta: bruto (entregas × valor) menos despesas. */
export function recordNet(r: NetInput): number {
  return r.delivered * Number(r.valuePerDelivery) - Number(r.expenses)
}

export type QuinzenaSplit = {
  year: number
  /** 0–11, mesmo índice de MONTHS em lib/format.ts. */
  month: number
  /** Dias 01–15. `days` = datas distintas com boleta. */
  first: { net: number; days: number }
  /** Dia 16 até o último dia com boleta (lastDay); null se não houver. `days` = datas distintas. */
  second: { net: number; days: number; lastDay: number | null }
}

/**
 * Líquido do mês de referência dividido em quinzenas.
 * Mês de referência = mês da boleta mais recente do conjunto recebido
 * (o conjunto já vem filtrado pelo período escolhido na tela).
 * Lê a data como texto (YYYY-MM-DD) para não depender de fuso horário.
 */
export function netByQuinzena(records: NetInput[]): QuinzenaSplit | null {
  if (!records.length) return null

  const latest = records.reduce((max, r) => (r.date > max ? r.date : max), records[0].date)
  const ym = latest.slice(0, 7)
  const [year, month1] = ym.split("-").map(Number)

  const result: QuinzenaSplit = {
    year,
    month: month1 - 1,
    first: { net: 0, days: 0 },
    second: { net: 0, days: 0, lastDay: null },
  }

  // `days` = datas distintas: na visão do gestor a mesma data tem uma boleta
  // por entregador e por painel.
  const firstDays = new Set<number>()
  const secondDays = new Set<number>()

  for (const r of records) {
    if (r.date.slice(0, 7) !== ym) continue
    const day = Number(r.date.slice(8, 10))
    const n = recordNet(r)
    if (day <= 15) {
      result.first.net += n
      firstDays.add(day)
    } else {
      result.second.net += n
      secondDays.add(day)
      if (result.second.lastDay === null || day > result.second.lastDay) result.second.lastDay = day
    }
  }

  result.first.days = firstDays.size
  result.second.days = secondDays.size
  return result
}
