// Números dos cartões do topo (StatsOverview), como função pura testável.
import { recordGross, recordNet } from "@/lib/metrics"

type Rec = { date: string; delivered: number; valuePerDelivery: string; expenses: string }
type Tx = { type: string; amount: string }

export function computeKpis(dailyRecords: Rec[], transactions: Tx[]) {
  const totalDelivered = dailyRecords.reduce((s, r) => s + r.delivered, 0)
  const totalGross = dailyRecords.reduce((s, r) => s + recordGross(r), 0)
  const totalExpenses = dailyRecords.reduce((s, r) => s + Number(r.expenses), 0)
  const totalNet = dailyRecords.reduce((s, r) => s + recordNet(r), 0)
  // Datas distintas: no /gestor há uma boleta por entregador por dia.
  const workDays = new Set(dailyRecords.map((r) => r.date)).size
  const avgNet = workDays ? totalNet / workDays : 0

  const receita = transactions.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0)
  const despesa = transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0)

  return { totalDelivered, totalGross, totalExpenses, totalNet, workDays, avgNet, receita, despesa, saldo: receita - despesa }
}
