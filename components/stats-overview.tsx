import { Truck, TrendingUp, TrendingDown, Wallet, Package } from "lucide-react"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

export function StatsOverview({
  deliveries, transactions, dailyRecords, periodLabel,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
  periodLabel?: string
}) {
  const totalDelivered = dailyRecords.reduce((s, r) => s + r.delivered, 0)
  const totalGross     = dailyRecords.reduce((s, r) => s + r.delivered * Number(r.valuePerDelivery), 0)
  const totalExpDR     = dailyRecords.reduce((s, r) => s + Number(r.expenses), 0)
  const totalNet       = totalGross - totalExpDR
  const workDays       = dailyRecords.length
  const avgNet         = workDays ? totalNet / workDays : 0

  const receita = transactions.filter(t => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0)
  const despesa = transactions.filter(t => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0)
  const saldo   = receita - despesa

  const cards = [
    { label: "Entregas realizadas", value: String(totalDelivered), hint: `${workDays} dias trabalhados`, icon: Truck, color: "text-primary" },
    { label: "Fat. bruto acumulado", value: formatCurrency(totalGross), hint: `Despesas: ${formatCurrency(totalExpDR)}`, icon: TrendingUp, color: "text-[var(--chart-2)]" },
    { label: "Fat. líquido acumulado", value: formatCurrency(totalNet), hint: `Média/dia: ${formatCurrency(avgNet)}`, icon: Wallet, color: totalNet >= 0 ? "text-[var(--chart-2)]" : "text-destructive" },
    { label: "Rastreio (total)", value: String(deliveries.length), hint: `${deliveries.filter(d => d.status === "pendente" || d.status === "em_transito").length} em aberto`, icon: Package, color: "text-[var(--chart-4)]" },
    { label: "Saldo financeiro", value: formatCurrency(saldo), hint: saldo >= 0 ? "Positivo" : "Negativo", icon: saldo >= 0 ? TrendingUp : TrendingDown, color: saldo >= 0 ? "text-[var(--chart-2)]" : "text-destructive" },
  ]

  return (
    <section className="mb-6">
      {periodLabel && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Exibindo período: <span className="text-foreground">{periodLabel}</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.hint}</p>
              </div>
              <c.icon className={`h-5 w-5 shrink-0 ${c.color}`} aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
