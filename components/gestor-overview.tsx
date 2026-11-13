"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"
import type { DailyRecord, Delivery, Transaction } from "@/lib/db/schema"
import { PeriodFilter } from "@/components/period-filter"
import { StatsOverview } from "@/components/stats-overview"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { filterByPeriod, formatCurrency, formatDate, panelLabel } from "@/lib/format"
import { memberStats, panelSummaries } from "@/lib/gestor-stats"
import { cn } from "@/lib/utils"

type Member = { userId: number; name: string; email: string }

const PANEL_COLOR: Record<string, string> = { jadlog: "var(--panel-jadlog)", panel2: "var(--panel-2)" }
const netColor = (n: number) => (n >= 0 ? "text-[var(--chart-2)]" : "text-destructive")

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/**
 * /gestor: período → painel → cartões do painel escolhido → entregadores.
 * D6: os cartões mostram UM painel por vez; os painéis nunca são somados.
 */
export function GestorOverview({
  dailyRecords, deliveries, transactions, members,
}: { dailyRecords: DailyRecord[]; deliveries: Delivery[]; transactions: Transaction[]; members: Member[] }) {
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [panel, setPanel] = useState("jadlog")
  const [query, setQuery] = useState("")

  const periodItems = useMemo(() => [...dailyRecords, ...transactions], [dailyRecords, transactions])
  const records = useMemo(() => filterByPeriod(dailyRecords, year, month), [dailyRecords, year, month])
  const txs = useMemo(() => filterByPeriod(transactions, year, month), [transactions, year, month])
  const summaries = useMemo(() => panelSummaries(records), [records])
  const stats = useMemo(() => memberStats(records), [records])
  const lastDates = useMemo(() => memberStats(dailyRecords), [dailyRecords])

  const visibleMembers = useMemo(() => {
    const q = norm(query.trim())
    return q ? members.filter((m) => norm(m.name).includes(q) || norm(m.email).includes(q)) : members
  }, [members, query])

  return (
    <>
      <div className="mb-4">
        <PeriodFilter items={periodItems} year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {/* Seletor de painel: cada botão já mostra o resumo do painel. */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Painel">
        {summaries.map((s) => {
          const active = s.panel === panel
          const color = PANEL_COLOR[s.panel] ?? "var(--primary)"
          return (
            <button
              key={s.panel}
              type="button"
              aria-pressed={active}
              onClick={() => setPanel(s.panel)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "" : "border-border hover:bg-muted/40",
              )}
              style={active ? { borderColor: color } : undefined}
            >
              <span>
                <span className="block text-sm font-semibold" style={{ color }}>{panelLabel(s.panel)}</span>
                <span className="block text-xs text-muted-foreground">{s.delivered} entregas</span>
              </span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${netColor(s.net)}`}>{formatCurrency(s.net)}</span>
            </button>
          )
        })}
      </div>

      <div data-panel={panel === "panel2" ? "panel2" : undefined}>
        <StatsOverview
          deliveries={deliveries.filter((d) => d.panel === panel)}
          transactions={txs.filter((t) => t.panel === panel)}
          dailyRecords={records.filter((r) => r.panel === panel)}
        />
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Entregadores ({members.length})</h2>
            {members.length > 0 && (
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input type="search" aria-label="Buscar entregador" placeholder="Buscar nome ou e-mail" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Nenhum entregador nesta organização ainda</p>
              <p className="text-xs text-muted-foreground">Use &quot;Convidar entregador&quot; em Convites para gerar um link de convite.</p>
            </div>
          ) : visibleMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum entregador com essa busca.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMembers.map((m) => {
                const st = stats.get(m.userId)
                const last = lastDates.get(m.userId)?.lastDate ?? null
                return (
                  <li key={m.userId}>
                    <Link
                      href={`/gestor/entregadores/${m.userId}?from=gestor`}
                      className="block h-full rounded-lg border border-border p-4 outline-none transition-colors hover:border-primary/50 hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <p className="font-semibold text-foreground">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      <dl className="mt-3 flex flex-col gap-1 text-sm">
                        {summaries.map((s) => {
                          const n = st?.byPanel[s.panel] ?? { delivered: 0, net: 0 }
                          return (
                            <div key={s.panel} className="flex items-center justify-between gap-2">
                              <dt className="text-xs" style={{ color: PANEL_COLOR[s.panel] }}>{panelLabel(s.panel)}</dt>
                              <dd className="flex items-baseline gap-2">
                                <span className="text-xs text-muted-foreground">{n.delivered} entregas</span>
                                <span className={`font-mono text-sm font-semibold tabular-nums ${netColor(n.net)}`}>{formatCurrency(n.net)}</span>
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {last ? `Última boleta: ${formatDate(last)}` : "Sem boletas"}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
