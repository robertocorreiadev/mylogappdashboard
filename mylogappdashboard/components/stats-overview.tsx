import { Package, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { Delivery, Transaction } from "@/lib/db/schema"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

export function StatsOverview({
  deliveries,
  transactions,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
}) {
  const totalDeliveries = deliveries.length
  const pending = deliveries.filter((d) => d.status === "pendente" || d.status === "em_transito").length

  const receita = transactions
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + Number(t.amount), 0)
  const despesa = transactions
    .filter((t) => t.type === "despesa")
    .reduce((acc, t) => acc + Number(t.amount), 0)
  const saldo = receita - despesa

  const cards = [
    {
      label: "Total de entregas",
      value: String(totalDeliveries),
      hint: `${pending} em aberto`,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "Receitas",
      value: formatCurrency(receita),
      hint: "Total recebido",
      icon: TrendingUp,
      color: "text-[var(--chart-2)]",
    },
    {
      label: "Despesas",
      value: formatCurrency(despesa),
      hint: "Total gasto",
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      label: "Saldo",
      value: formatCurrency(saldo),
      hint: saldo >= 0 ? "Positivo" : "Negativo",
      icon: Wallet,
      color: saldo >= 0 ? "text-[var(--chart-2)]" : "text-destructive",
    },
  ]

  return (
    <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
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
    </section>
  )
}
