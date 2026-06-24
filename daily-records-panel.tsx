"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, Pencil, Trash2, ClipboardList, TrendingUp, TrendingDown, Settings, Calendar, CheckCircle2, Clock, AlertTriangle, Receipt } from "lucide-react"
import type { DailyRecord } from "@/lib/db/schema"
import { saveDailyRecord, deleteDailyRecord } from "@/app/actions/daily-records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]

function gross(r: DailyRecord) { return r.delivered * Number(r.valuePerDelivery) }
function net(r: DailyRecord)   { return gross(r) - Number(r.expenses) }

function fmtBR(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

// ── Barra resumo mensal/anual ────────────────────────────────
function SummaryBar({ label, records, isAnnual = false }: { label: string; records: DailyRecord[]; isAnnual?: boolean }) {
  if (!records.length) return null
  const tDel   = records.reduce((s, r) => s + r.delivered, 0)
  const tGross = records.reduce((s, r) => s + gross(r), 0)
  const tExp   = records.reduce((s, r) => s + Number(r.expenses), 0)
  const tNet   = tGross - tExp
  const days   = records.length
  const avg    = days ? tNet / days : 0
  const pos    = tNet >= 0

  return (
    <TableRow className={isAnnual ? "border-t-2 border-primary/50 bg-primary/5" : "border-t border-primary/20 bg-primary/[0.03]"}>
      <TableCell colSpan={9} className="py-2 px-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span className={`font-bold uppercase tracking-wide ${isAnnual ? "text-primary text-sm" : "text-primary/80"}`}>
            {isAnnual ? "▶ " : "↳ "}{label}
          </span>
          <span className="text-muted-foreground">{days} dias · <strong className="text-foreground">{tDel}</strong> entregas</span>
          <span className="text-muted-foreground">Bruto: <strong className="text-foreground">{formatCurrency(tGross)}</strong></span>
          <span className="text-muted-foreground">Despesas: <strong className="text-destructive">{formatCurrency(tExp)}</strong></span>
          <span className="text-muted-foreground">Líquido: <strong className={pos ? "text-[var(--chart-2)]" : "text-destructive"}>{formatCurrency(tNet)}</strong></span>
          <span className="text-muted-foreground">Média/dia: <strong className={avg >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}>{formatCurrency(avg)}</strong></span>
          <span className={`ml-auto flex items-center gap-1 font-semibold ${pos ? "text-[var(--chart-2)]" : "text-destructive"}`}>
            {pos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {pos ? "▲ Positivo" : "▼ Negativo"}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Formulário de registro — fiel à referência visual ────────
function RecordForm({ initial, onClose }: { initial?: Partial<DailyRecord>; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const [delivered, setDelivered]  = useState(initial?.delivered ?? 0)
  const [vpd, setVpd]              = useState(Number(initial?.valuePerDelivery ?? 3.5))
  const [expenses, setExpenses]    = useState(Number(initial?.expenses ?? 0))
  const tGross = delivered * vpd
  const tNet   = tGross - expenses

  function handleSubmit(fd: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await saveDailyRecord(fd)
      if (res?.error) setError(res.error)
      else onClose()
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      {/* Valor por entrega */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2">
        <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Label htmlFor="vpd" className="shrink-0 text-sm text-muted-foreground">Valor por entrega (R$)</Label>
        <Input
          id="vpd" name="valuePerDelivery" type="number" step="0.10" min="0.01" required
          className="w-24 font-mono"
          value={vpd} onChange={e => setVpd(Number(e.target.value))}
        />
        <span className="text-xs text-muted-foreground">← altere se o valor mudar</span>
      </div>

      {/* Grid de campos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="grid gap-1.5">
          <Label htmlFor="date" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Data
          </Label>
          <Input id="date" name="date" type="date" required defaultValue={initial?.date ?? today} className="text-sm" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="delivered" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Entregas realizadas
          </Label>
          <Input id="delivered" name="delivered" type="number" min="0" placeholder="0"
            value={delivered} onChange={e => setDelivered(Number(e.target.value))} className="font-mono" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="scheduled" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Agendadas (sem sucesso)
          </Label>
          <Input id="scheduled" name="scheduled" type="number" min="0" placeholder="0"
            defaultValue={initial?.scheduled ?? 0} className="font-mono" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="occurrences" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" /> Com ocorrência
          </Label>
          <Input id="occurrences" name="occurrences" type="number" min="0" placeholder="0"
            defaultValue={initial?.occurrences ?? 0} className="font-mono" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="expenses" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Despesas do dia (R$)
          </Label>
          <Input id="expenses" name="expenses" type="number" step="0.01" min="0" placeholder="0,00"
            value={expenses} onChange={e => setExpenses(Number(e.target.value))} className="font-mono" />
        </div>
      </div>

      {/* Indicadores em tempo real */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-secondary/40">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Faturamento bruto</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-foreground">{formatCurrency(tGross)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-destructive">− {formatCurrency(expenses)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-foreground">Faturamento líquido</p>
          <p className={`mt-0.5 font-mono text-lg font-bold ${tNet >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
            {formatCurrency(tNet)}
          </p>
        </div>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending} className="w-full gap-2">
          <Receipt className="h-4 w-4" />
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Linha da tabela ──────────────────────────────────────────
function RecordRow({ record, vpd }: { record: DailyRecord; vpd: number }) {
  const [editOpen, setEditOpen]    = useState(false)
  const [pending, startTransition] = useTransition()
  const g = gross(record)
  const n = net(record)
  const d = new Date(record.date + "T00:00:00")

  return (
    <>
      <TableRow className="hover:bg-secondary/50 cursor-default">
        <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
          {fmtBR(record.date)}
          <span className={`ml-2 text-[11px] font-medium ${d.getDay() === 0 || d.getDay() === 6 ? "text-primary" : "text-muted-foreground"}`}>
            {DAYS[d.getDay()]}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums">{record.delivered}</TableCell>
        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{record.scheduled}</TableCell>
        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{record.occurrences}</TableCell>
        <TableCell className="text-right font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          R$ {Number(record.valuePerDelivery).toFixed(2).replace(".", ",")}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">{formatCurrency(g)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums text-destructive whitespace-nowrap">− {formatCurrency(Number(record.expenses))}</TableCell>
        <TableCell className={`text-right font-mono tabular-nums font-semibold whitespace-nowrap ${n >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
          {formatCurrency(n)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)} aria-label="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={pending} onClick={() => startTransition(() => deleteDailyRecord(record.id))} aria-label="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar boleta — {fmtBR(record.date)}</DialogTitle>
            <DialogDescription>Altere os dados do dia e salve.</DialogDescription>
          </DialogHeader>
          <RecordForm initial={record} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Filtros da tabela de histórico ───────────────────────────
function HistoryFilters({
  months, selectedMonth, setSelectedMonth,
  filter, setFilter,
}: {
  months: number[]
  selectedMonth: number | null
  setSelectedMonth: (m: number | null) => void
  filter: "all" | "filled" | "pending"
  setFilter: (f: "all" | "filled" | "pending") => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <select
        value={selectedMonth ?? ""}
        onChange={e => setSelectedMonth(e.target.value === "" ? null : Number(e.target.value))}
        className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
      >
        <option value="">Todos os meses</option>
        {months.map(m => <option key={m} value={m}>{MONTHS[m]}</option>)}
      </select>
      <select
        value={filter}
        onChange={e => setFilter(e.target.value as "all" | "filled" | "pending")}
        className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
      >
        <option value="all">Todos</option>
        <option value="filled">Registrados</option>
        <option value="pending">Pendentes</option>
      </select>
    </div>
  )
}

// ── Painel principal ─────────────────────────────────────────
export function DailyRecordsPanel({ records }: { records: DailyRecord[] }) {
  const [formOpen, setFormOpen]       = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [filter, setFilter]           = useState<"all" | "filled" | "pending">("all")

  const currentVpd = records.length ? Number(records[0].valuePerDelivery) : 3.50

  // Agrupa registros por ano → mês
  const grouped = useMemo(() => {
    const map: Record<number, Record<number, DailyRecord[]>> = {}
    for (const r of records) {
      const d = new Date(r.date + "T00:00:00")
      const y = d.getFullYear(), m = d.getMonth()
      if (!map[y]) map[y] = {}
      if (!map[y][m]) map[y][m] = []
      map[y][m].push(r)
    }
    return map
  }, [records])

  const years        = Object.keys(grouped).map(Number).sort((a, b) => b - a)
  const allMonths    = useMemo(() => Array.from(new Set(records.map(r => new Date(r.date + "T00:00:00").getMonth()))).sort((a, b) => a - b), [records])
  const annualTotals = useMemo(() => {
    const out: Record<number, DailyRecord[]> = {}
    for (const y of years) out[y] = Object.values(grouped[y]).flat()
    return out
  }, [grouped, years])

  // Linhas visíveis com filtros
  const visibleRecords = useMemo(() => {
    return records.filter(r => {
      const m = new Date(r.date + "T00:00:00").getMonth()
      if (selectedMonth !== null && m !== selectedMonth) return false
      if (filter === "filled") return r.delivered > 0
      if (filter === "pending") return r.delivered === 0
      return true
    })
  }, [records, selectedMonth, filter])

  return (
    <Card>
      <CardContent className="p-4 md:p-6">

        {/* ── Formulário de registro (sempre visível no topo, igual à referência) ── */}
        <div className="mb-6 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Registrar entrega do dia
            </span>
          </div>
          <div className="p-4">
            <RecordForm onClose={() => {}} />
          </div>
        </div>

        {/* ── Histórico ── */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Histórico {new Date().getFullYear()}
          </h2>
          {/* Botão flutuante para novo registro via dialog em mobile */}
          <Button size="sm" variant="outline" className="gap-2 lg:hidden" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Nova boleta
          </Button>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhuma boleta registrada</p>
            <p className="text-xs text-muted-foreground">Preencha o formulário acima para começar.</p>
          </div>
        ) : (
          <>
            <HistoryFilters
              months={allMonths} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
              filter={filter} setFilter={setFilter}
            />
            {/* Tabela sem scroll horizontal — colunas compactas */}
            <div className="w-full rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-right text-xs">Realizadas</TableHead>
                    <TableHead className="text-right text-xs">Agendadas</TableHead>
                    <TableHead className="text-right text-xs">Ocorrências</TableHead>
                    <TableHead className="text-right text-xs">R$/unid.</TableHead>
                    <TableHead className="text-right text-xs">Fat. Bruto</TableHead>
                    <TableHead className="text-right text-xs">Despesas</TableHead>
                    <TableHead className="text-right text-xs">Fat. Líquido</TableHead>
                    <TableHead className="text-right text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map(year => {
                    const months = selectedMonth !== null
                      ? (grouped[year]?.[selectedMonth] ? [selectedMonth] : [])
                      : Object.keys(grouped[year]).map(Number).sort((a, b) => b - a)

                    return months.map(month => {
                      const monthRecs = (grouped[year]?.[month] ?? [])
                        .filter(r => {
                          if (filter === "filled")  return r.delivered > 0
                          if (filter === "pending") return r.delivered === 0
                          return true
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                      if (!monthRecs.length) return null
                      return (
                        <>
                          {/* Cabeçalho do mês */}
                          <TableRow key={`${year}-${month}-hdr`} className="border-t border-border">
                            <TableCell colSpan={9} className="bg-secondary/40 py-1.5 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {MONTHS[month]} {year}
                            </TableCell>
                          </TableRow>

                          {/* Linhas do mês */}
                          {monthRecs.map(r => (
                            <RecordRow key={r.id} record={r} vpd={currentVpd} />
                          ))}

                          {/* Resumo mensal */}
                          <SummaryBar
                            key={`${year}-${month}-sum`}
                            label={`Resumo ${MONTHS[month]} ${year}`}
                            records={grouped[year][month]}
                          />
                        </>
                      )
                    })
                  })}

                  {/* Resumo anual por ano */}
                  {years.map(year => (
                    <SummaryBar
                      key={`${year}-annual`}
                      label={`Resumo Anual ${year}`}
                      records={annualTotals[year]}
                      isAnnual
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {/* Dialog para mobile */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar boleta do dia</DialogTitle>
            <DialogDescription>Preencha os dados de entrega do dia.</DialogDescription>
          </DialogHeader>
          <RecordForm onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
