"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import type { Delivery, Transaction } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { statusLabel } from "@/lib/format"

const STATUS_COLORS: Record<string, string> = {
  pendente: "var(--chart-5)",
  em_transito: "var(--chart-4)",
  entregue: "var(--chart-2)",
  cancelada: "var(--chart-3)",
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export function OverviewPanel({
  deliveries,
  transactions,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
}) {
  const statusData = Object.entries(
    deliveries.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1
      return acc
    }, {}),
  ).map(([status, count]) => ({ status, label: statusLabel(status), count, fill: STATUS_COLORS[status] }))

  const monthMap: Record<string, { receita: number; despesa: number }> = {}
  for (const t of transactions) {
    const d = new Date(t.date + "T00:00:00")
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthMap[key] = monthMap[key] ?? { receita: 0, despesa: 0 }
    if (t.type === "receita") monthMap[key].receita += Number(t.amount)
    else monthMap[key].despesa += Number(t.amount)
  }
  const financeData = Object.entries(monthMap)
    .map(([key, v]) => {
      const [year, month] = key.split("-").map(Number)
      return { sort: year * 12 + month, mes: `${MONTHS[month]}/${String(year).slice(2)}`, ...v }
    })
    .sort((a, b) => a.sort - b.sort)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entregas por status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem dados de entregas.</p>
          ) : (
            <ChartContainer
              config={{ count: { label: "Entregas" } }}
              className="mx-auto aspect-square max-h-[260px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie data={statusData} dataKey="count" nameKey="label" innerRadius={55} strokeWidth={2}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {statusData.map((s) => (
              <div key={s.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                {s.label} ({s.count})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas x Despesas por mês</CardTitle>
        </CardHeader>
        <CardContent>
          {financeData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem lançamentos financeiros.</p>
          ) : (
            <ChartContainer
              config={{
                receita: { label: "Receita", color: "var(--chart-2)" },
                despesa: { label: "Despesa", color: "var(--chart-3)" },
              }}
              className="max-h-[260px] w-full"
            >
              <BarChart data={financeData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
                <Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
