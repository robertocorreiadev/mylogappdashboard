"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { statusLabel, formatCurrency } from "@/lib/format"

const STATUS_COLORS: Record<string, string> = {
  pendente: "var(--chart-5)",
  em_transito: "var(--chart-4)",
  entregue: "var(--chart-2)",
  cancelada: "var(--chart-3)",
}
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export function OverviewPanel({
  deliveries, transactions, dailyRecords,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
}) {
  // Entregas por status
  const statusData = Object.entries(
    deliveries.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1
      return acc
    }, {})
  ).map(([status, count]) => ({ status, label: statusLabel(status), count, fill: STATUS_COLORS[status] ?? "var(--chart-1)" }))

  // Boletas mensais
  const boletaMap: Record<string, { bruto: number; liquido: number; despesas: number }> = {}
  for (const r of dailyRecords) {
    const d = new Date(r.date + "T00:00:00")
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!boletaMap[key]) boletaMap[key] = { bruto: 0, liquido: 0, despesas: 0 }
    const g = r.delivered * Number(r.valuePerDelivery)
    boletaMap[key].bruto    += g
    boletaMap[key].despesas += Number(r.expenses)
    boletaMap[key].liquido  += g - Number(r.expenses)
  }
  const boletaData = Object.entries(boletaMap).map(([key, v]) => {
    const [year, month] = key.split("-").map(Number)
    return { sort: year * 12 + month, mes: `${MONTHS[month]}/${String(year).slice(2)}`, ...v }
  }).sort((a, b) => a.sort - b.sort)

  // Financeiro mensal
  const finMap: Record<string, { receita: number; despesa: number }> = {}
  for (const t of transactions) {
    const d = new Date(t.date + "T00:00:00")
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!finMap[key]) finMap[key] = { receita: 0, despesa: 0 }
    if (t.type === "receita") finMap[key].receita += Number(t.amount)
    else finMap[key].despesa += Number(t.amount)
  }
  const finData = Object.entries(finMap).map(([key, v]) => {
    const [year, month] = key.split("-").map(Number)
    return { sort: year * 12 + month, mes: `${MONTHS[month]}/${String(year).slice(2)}`, ...v }
  }).sort((a, b) => a.sort - b.sort)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Boletas mensais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Boletas mensais (bruto × líquido)</CardTitle></CardHeader>
        <CardContent>
          {boletaData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem boletas registradas.</p>
          ) : (
            <ChartContainer
              config={{
                bruto:    { label: "Bruto",    color: "var(--chart-1)" },
                liquido:  { label: "Líquido",  color: "var(--chart-2)" },
                despesas: { label: "Despesas", color: "var(--chart-3)" },
              }}
              className="max-h-[260px] w-full"
            >
              <BarChart data={boletaData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={55}
                  tickFormatter={v => `R$${(Number(v)/1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(Number(v))} />} />
                <Bar dataKey="bruto"    fill="var(--color-bruto)"    radius={4} />
                <Bar dataKey="liquido"  fill="var(--color-liquido)"  radius={4} />
                <Bar dataKey="despesas" fill="var(--color-despesas)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Entregas por status */}
      <Card>
        <CardHeader><CardTitle className="text-base">Entregas por status (rastreio)</CardTitle></CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem dados de entregas.</p>
          ) : (
            <ChartContainer config={{ count: { label: "Entregas" } }} className="mx-auto aspect-square max-h-[260px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                <Pie data={statusData} dataKey="count" nameKey="label" innerRadius={55} strokeWidth={2}>
                  {statusData.map(e => <Cell key={e.status} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {statusData.map(s => (
              <div key={s.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                {s.label} ({s.count})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receitas x Despesas financeiras */}
      {finData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Receitas × Despesas (financeiro)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                receita: { label: "Receita", color: "var(--chart-2)" },
                despesa: { label: "Despesa", color: "var(--chart-3)" },
              }}
              className="max-h-[220px] w-full"
            >
              <BarChart data={finData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
                <Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
