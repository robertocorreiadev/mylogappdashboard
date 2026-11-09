import { Truck, TrendingUp, TrendingDown, Wallet, Package } from "lucide-react"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, MONTHS } from "@/lib/format"
import { netByQuinzena, recordGross, recordNet, type QuinzenaSplit } from "@/lib/metrics"

function netColor(value: number, days: number) {
  if (!days) return "text-muted-foreground"
  return value >= 0 ? "text-[var(--chart-2)]" : "text-destructive"
}

function secondRange(lastDay: number | null) {
  if (lastDay === null) return ""
  return lastDay === 16 ? "16" : `16–${String(lastDay).padStart(2, "0")}`
}

// Faixa "Quinzenas" dentro do card de líquido: 1ª = dias 01–15,
// 2ª = dia 16 até o último dia com boleta do mês de referência.
// Quinzena sem boleta mostra "sem registros" nas duas metades, do mesmo jeito.
// No lg o card tem 1/5 da largura: as metades empilham para o valor não ser
// cortado (o Card tem overflow-hidden).
function QuinzenaStrip({ q }: { q: QuinzenaSplit }) {
  const halves = [
    { label: "1ª quinzena", ...q.first, range: "01–15" },
    { label: "2ª quinzena", ...q.second, range: secondRange(q.second.lastDay) },
  ]
  return (
    <div className="mx-4 -mt-2 border-t border-border pt-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Quinzenas · {MONTHS[q.month].slice(0, 3)}/{q.year}
      </p>
      <div className="grid grid-cols-2 divide-x divide-border lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
        {halves.map((h, i) => (
          <div
            key={h.label}
            className={i === 0 ? "pr-2 lg:pr-0 lg:pb-1.5" : "pl-2 lg:pl-0 lg:pt-1.5"}
            title={`${h.days} ${h.days === 1 ? "dia" : "dias"} com boleta`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{h.label}</p>
            <p className={`whitespace-nowrap text-sm font-semibold tabular-nums ${netColor(h.net, h.days)}`}>{formatCurrency(h.net)}</p>
            <p className="text-[10px] text-muted-foreground">{h.days ? h.range : "sem registros"}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsOverview({
  deliveries, transactions, dailyRecords, periodLabel,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
  periodLabel?: string
}) {
  const totalDelivered = dailyRecords.reduce((s, r) => s + r.delivered, 0)
  const totalGross     = dailyRecords.reduce((s, r) => s + recordGross(r), 0)
  const totalExpDR     = dailyRecords.reduce((s, r) => s + Number(r.expenses), 0)
  const totalNet       = dailyRecords.reduce((s, r) => s + recordNet(r), 0)
  const workDays       = dailyRecords.length
  const avgNet         = workDays ? totalNet / workDays : 0

  const receita = transactions.filter(t => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0)
  const despesa = transactions.filter(t => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0)
  const saldo   = receita - despesa

  const quinzenas = netByQuinzena(dailyRecords)

  const cards = [
    { label: "Entregas realizadas", value: String(totalDelivered), hint: `${workDays} dias trabalhados`, icon: Truck, color: "text-primary" },
    { label: "Fat. bruto acumulado", value: formatCurrency(totalGross), hint: `Despesas: ${formatCurrency(totalExpDR)}`, icon: TrendingUp, color: "text-[var(--chart-2)]" },
    { label: "Fat. líquido acumulado", value: formatCurrency(totalNet), hint: `Média/dia: ${formatCurrency(avgNet)}`, icon: Wallet, color: totalNet >= 0 ? "text-[var(--chart-2)]" : "text-destructive", split: true },
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
          <Card key={c.label} className={c.split ? "col-span-2 lg:col-span-1" : undefined}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                {/* Hierarquia vem do tamanho/tipografia de exibição, não do peso —
                    serifada só neste número (destaque do card), sans no resto. */}
                <p className="mt-1 font-display text-2xl font-normal tabular-nums text-foreground">{c.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.hint}</p>
              </div>
              <c.icon className={`h-5 w-5 shrink-0 ${c.color}`} aria-hidden="true" />
            </CardContent>
            {c.split && quinzenas && <QuinzenaStrip q={quinzenas} />}
          </Card>
        ))}
      </div>
    </section>
  )
}
