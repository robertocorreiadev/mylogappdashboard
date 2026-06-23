"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, Pencil, Trash2, ClipboardList, TrendingUp, TrendingDown } from "lucide-react"
import type { DailyRecord } from "@/lib/db/schema"
import { saveDailyRecord, deleteDailyRecord } from "@/app/actions/daily-records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]

function gross(r: DailyRecord) { return r.delivered * Number(r.valuePerDelivery) }
function net(r: DailyRecord)   { return gross(r) - Number(r.expenses) }

// ── Barra de resumo (mensal ou anual) ───────────────────────
function SummaryBar({ label, records }: { label: string; records: DailyRecord[] }) {
  if (!records.length) return null
  const tDel  = records.reduce((s, r) => s + r.delivered, 0)
  const tGross = records.reduce((s, r) => s + gross(r), 0)
  const tExp  = records.reduce((s, r) => s + Number(r.expenses), 0)
  const tNet  = tGross - tExp
  const days  = records.length
  const avg   = days ? tNet / days : 0
  const pos   = tNet >= 0

  return (
    <tr className="border-t-2 border-primary/40">
      <td colSpan={9} className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-primary/5 px-4 py-2 text-xs">
          <span className="font-bold uppercase tracking-wide text-primary">{label}</span>
          <span className="text-muted-foreground">{days} dias · {tDel} entregas</span>
          <span className="text-muted-foreground">Bruto: <strong className="text-foreground">{formatCurrency(tGross)}</strong></span>
          <span className="text-muted-foreground">Despesas: <strong className="text-destructive">{formatCurrency(tExp)}</strong></span>
          <span className="text-muted-foreground">Líquido: <strong className={pos ? "text-[var(--chart-2)]" : "text-destructive"}>{formatCurrency(tNet)}</strong></span>
          <span className="text-muted-foreground">Média/dia: <strong className={avg >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}>{formatCurrency(avg)}</strong></span>
          <span className="ml-auto flex items-center gap-1 font-semibold">
            {pos ? <TrendingUp className="h-3.5 w-3.5 text-[var(--chart-2)]" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            <span className={pos ? "text-[var(--chart-2)]" : "text-destructive"}>{pos ? "▲ Positivo" : "▼ Negativo"}</span>
          </span>
        </div>
      </td>
    </tr>
  )
}

// ── Formulário ───────────────────────────────────────────────
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
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="vpd">Valor por entrega (R$)</Label>
          <Input id="vpd" name="valuePerDelivery" type="number" step="0.01" min="0.01" required
            value={vpd} onChange={e => setVpd(Number(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" required defaultValue={initial?.date ?? today} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="delivered">Entregas realizadas</Label>
          <Input id="delivered" name="delivered" type="number" min="0" placeholder="0"
            value={delivered} onChange={e => setDelivered(Number(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="scheduled">Agendadas (sem sucesso)</Label>
          <Input id="scheduled" name="scheduled" type="number" min="0" placeholder="0" defaultValue={initial?.scheduled ?? 0} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="occurrences">Com ocorrência</Label>
          <Input id="occurrences" name="occurrences" type="number" min="0" placeholder="0" defaultValue={initial?.occurrences ?? 0} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="expenses">Despesas do dia (R$)</Label>
        <Input id="expenses" name="expenses" type="number" step="0.01" min="0" placeholder="0,00"
          value={expenses} onChange={e => setExpenses(Number(e.target.value))} />
      </div>
      {/* Preview em tempo real */}
      <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-muted-foreground">Faturamento bruto</span>
          <span className="font-mono font-semibold">{formatCurrency(tGross)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-muted-foreground">Despesas</span>
          <span className="font-mono font-semibold text-destructive">− {formatCurrency(expenses)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1.5">
          <span className="font-semibold">Faturamento líquido</span>
          <span className={`font-mono text-base font-bold ${tNet >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
            {formatCurrency(tNet)}
          </span>
        </div>
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar boleta"}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Linha da tabela ──────────────────────────────────────────
function RecordRow({ record }: { record: DailyRecord }) {
  const [open, setOpen]            = useState(false)
  const [pending, startTransition] = useTransition()
  const g = gross(record)
  const n = net(record)
  const d = new Date(record.date + "T00:00:00")

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {formatDate(record.date)}
        <span className="ml-1.5 text-muted-foreground">{DAYS[d.getDay()]}</span>
      </TableCell>
      <TableCell className="text-right font-mono">{record.delivered}</TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">{record.scheduled}</TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">{record.occurrences}</TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">R$ {Number(record.valuePerDelivery).toFixed(2).replace(".", ",")}</TableCell>
      <TableCell className="text-right font-mono">{formatCurrency(g)}</TableCell>
      <TableCell className="text-right font-mono text-destructive">− {formatCurrency(Number(record.expenses))}</TableCell>
      <TableCell className={`text-right font-mono font-semibold ${n >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>{formatCurrency(n)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar boleta</DialogTitle>
                <DialogDescription>Altere os dados do dia {formatDate(record.date)}.</DialogDescription>
              </DialogHeader>
              <RecordForm initial={record} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={pending} onClick={() => startTransition(() => deleteDailyRecord(record.id))} aria-label="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Painel principal ─────────────────────────────────────────
export function DailyRecordsPanel({ records }: { records: DailyRecord[] }) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map: Record<number, Record<number, DailyRecord[]>> = {}
    for (const r of records) {
      const d = new Date(r.date + "T00:00:00")
      const y = d.getFullYear(); const m = d.getMonth()
      if (!map[y]) map[y] = {}
      if (!map[y][m]) map[y][m] = []
      map[y][m].push(r)
    }
    return map
  }, [records])

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)
  const annualTotals = useMemo(() => {
    const out: Record<number, DailyRecord[]> = {}
    for (const y of years) out[y] = Object.values(grouped[y]).flat()
    return out
  }, [grouped, years])

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Boleta Diária de Entregas</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Nova boleta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar boleta do dia</DialogTitle>
                <DialogDescription>Preencha os dados de entrega do dia.</DialogDescription>
              </DialogHeader>
              <RecordForm onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma boleta registrada</p>
            <p className="text-xs text-muted-foreground">Clique em &quot;Nova boleta&quot; para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Realizadas</TableHead>
                  <TableHead className="text-right">Agendadas</TableHead>
                  <TableHead className="text-right">Ocorrências</TableHead>
                  <TableHead className="text-right">R$/unid.</TableHead>
                  <TableHead className="text-right">Fat. Bruto</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Fat. Líquido</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map(year => {
                  const months = Object.keys(grouped[year]).map(Number).sort((a, b) => b - a)
                  return (
                    <>
                      {months.map(month => {
                        const mr = grouped[year][month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        return (
                          <>
                            <tr key={`${year}-${month}-h`} className="border-t border-border">
                              <td colSpan={9} className="bg-secondary/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {MONTHS[month]} {year}
                              </td>
                            </tr>
                            {mr.map(r => <RecordRow key={r.id} record={r} />)}
                            <SummaryBar key={`${year}-${month}-s`} label={`Resumo ${MONTHS[month]}`} records={mr} />
                          </>
                        )
                      })}
                      <SummaryBar key={`${year}-annual`} label={`▶ RESUMO ANUAL ${year}`} records={annualTotals[year]} />
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
