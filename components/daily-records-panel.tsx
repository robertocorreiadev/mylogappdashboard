"use client"

import { toast } from "sonner"
import { Fragment, useMemo, useState, useTransition } from "react"
import {
  Pencil, ClipboardList, TrendingUp, TrendingDown, Settings, Calendar, CheckCircle2, Clock,
  AlertTriangle, Receipt, Download, Lock,
} from "lucide-react"
import type { DailyRecord } from "@/lib/db/schema"
import { FormError } from "@/components/form-error"
import type { ActionResult } from "@/lib/forms"
import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { MoneyInput, CountInput } from "@/components/money-input"
import { localDateISO } from "@/lib/dates"
import { recordGross, recordNet } from "@/lib/metrics"
import { decimalValue } from "@/lib/money"
import { lastValuePerDelivery, filterByDelivered, type DeliveredFilter } from "@/lib/boleta"
import { saveDailyRecord, deleteDailyRecord } from "@/app/actions/daily-records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { toCsv, downloadCsv } from "@/lib/csv"

type SaveAction = (formData: FormData) => Promise<ActionResult>
type DeleteAction = (id: number) => Promise<void>

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function dayOf(date: string) {
  return new Date(date + "T00:00:00").getDay()
}
function isWeekend(date: string) {
  const d = dayOf(date)
  return d === 0 || d === 6
}
const netColor = (n: number) => (n >= 0 ? "text-[var(--chart-2)]" : "text-destructive")

function totals(records: DailyRecord[]) {
  const delivered = records.reduce((s, r) => s + r.delivered, 0)
  const gross = records.reduce((s, r) => s + recordGross(r), 0)
  const expenses = records.reduce((s, r) => s + Number(r.expenses), 0)
  const net = gross - expenses
  const days = records.length
  return { delivered, gross, expenses, net, days, avg: days ? net / days : 0 }
}

// ── Resumos (mês e ano) ──────────────────────────────────────
function SummaryRow({ label, records, isAnnual = false, cols }: { label: string; records: DailyRecord[]; isAnnual?: boolean; cols: number }) {
  if (!records.length) return null
  const t = totals(records)
  const pos = t.net >= 0
  return (
    <TableRow className={isAnnual ? "border-t-2 border-primary/50 bg-primary/5" : "border-t border-primary/20 bg-primary/[0.03]"}>
      <TableCell colSpan={cols} className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span className={`font-bold uppercase tracking-wide ${isAnnual ? "text-primary" : "text-primary/80"}`}>
            {isAnnual ? "▶ " : "↳ "}{label}
          </span>
          <span className="text-muted-foreground">{t.days} dias · <strong className="text-foreground">{t.delivered}</strong> entregas</span>
          <span className="text-muted-foreground">Bruto: <strong className="text-foreground">{formatCurrency(t.gross)}</strong></span>
          <span className="text-muted-foreground">Despesas: <strong className="text-destructive">{formatCurrency(t.expenses)}</strong></span>
          <span className="text-muted-foreground">Líquido: <strong className={netColor(t.net)}>{formatCurrency(t.net)}</strong></span>
          <span className="text-muted-foreground">Média/dia: <strong className={netColor(t.avg)}>{formatCurrency(t.avg)}</strong></span>
          <span className={`ml-auto flex items-center gap-1 font-semibold ${netColor(t.net)}`}>
            {pos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {pos ? "▲ Positivo" : "▼ Negativo"}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SummaryCard({ label, records, isAnnual = false }: { label: string; records: DailyRecord[]; isAnnual?: boolean }) {
  if (!records.length) return null
  const t = totals(records)
  return (
    <div className={`rounded-lg border p-3 text-xs ${isAnnual ? "border-primary/50 bg-primary/5" : "border-primary/20 bg-primary/[0.03]"}`}>
      <p className={`mb-1.5 font-bold uppercase tracking-wide ${isAnnual ? "text-primary" : "text-primary/80"}`}>{label}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">{t.days} dias</dt><dd className="text-right text-foreground">{t.delivered} entregas</dd>
        <dt className="text-muted-foreground">Bruto</dt><dd className="text-right font-mono text-foreground">{formatCurrency(t.gross)}</dd>
        <dt className="text-muted-foreground">Despesas</dt><dd className="text-right font-mono text-destructive">{formatCurrency(t.expenses)}</dd>
        <dt className="font-semibold text-foreground">Líquido</dt><dd className={`text-right font-mono font-semibold ${netColor(t.net)}`}>{formatCurrency(t.net)}</dd>
        <dt className="text-muted-foreground">Média/dia</dt><dd className={`text-right font-mono ${netColor(t.avg)}`}>{formatCurrency(t.avg)}</dd>
      </dl>
    </div>
  )
}

// ── Formulário (registrar e editar) ──────────────────────────
function RecordForm({
  initial, mode, panel = "jadlog", onSave = saveDailyRecord, onDone, existingDates, defaultVpd = "3.50",
}: {
  initial?: DailyRecord
  mode: "create" | "edit"
  panel?: string
  onSave?: SaveAction
  /** Depois de salvar: fecha o modal (edição) ou limpa o form (registro). */
  onDone: () => void
  /** Datas que já têm boleta: registrar numa delas pede confirmação. */
  existingDates?: Set<string>
  defaultVpd?: string
}) {
  const today = localDateISO() // D2: data local, não UTC
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmFd, setConfirmFd] = useState<FormData | null>(null)
  const [vpd, setVpd] = useState(initial ? Number(initial.valuePerDelivery).toFixed(2) : defaultVpd)
  const [delivered, setDelivered] = useState(initial ? String(initial.delivered) : "")
  const [expenses, setExpenses] = useState(initial && Number(initial.expenses) ? Number(initial.expenses).toFixed(2) : "")

  const tGross = (parseInt(delivered) || 0) * decimalValue(vpd)
  const tExpenses = decimalValue(expenses)
  const tNet = tGross - tExpenses

  function save(fd: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await onSave(fd)
      if (res?.error) { setError(res.error); return }
      const d = String(fd.get("date") ?? "")
      toast.success(d ? `Boleta de ${d.slice(8, 10)}/${d.slice(5, 7)} salva` : "Boleta salva")
      onDone()
    })
  }

  // onSubmit + preventDefault, não `action`: o React 19 limpa os campos depois
  // de uma `action`, e com erro o usuário perderia o que digitou.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Registrar numa data que já tem boleta substitui os números dela: pergunta antes.
    if (mode === "create" && existingDates?.has(String(fd.get("date")))) {
      setConfirmFd(fd)
      return
    }
    save(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="@container grid gap-5">
      <input type="hidden" name="panel" value={panel} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-secondary/50 px-3 py-2.5">
        <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Label htmlFor={`vpd-${mode}`} className="shrink-0 text-sm text-muted-foreground">Valor por entrega (R$)</Label>
        <MoneyInput id={`vpd-${mode}`} name="valuePerDelivery" required className="h-8 w-24" value={vpd} onValueChange={setVpd} />
        <span className="text-xs text-muted-foreground">Altere só se o valor mudar.</span>
      </div>

      {/* @container: as colunas seguem a largura do form (página ou modal), não a da tela. */}
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`date-${mode}`} className="flex items-center gap-1 text-xs text-muted-foreground">
            {mode === "edit" ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Calendar className="h-3.5 w-3.5" aria-hidden="true" />} Data
          </Label>
          <Input
            id={`date-${mode}`} name="date" type="date" required
            defaultValue={initial?.date ?? today}
            readOnly={mode === "edit"}
            aria-describedby={mode === "edit" ? "date-locked-hint" : undefined}
            className="font-mono text-sm read-only:opacity-70"
          />
          {mode === "edit" && (
            <p id="date-locked-hint" className="text-[11px] text-muted-foreground">Para mudar a data, exclua e registre de novo.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`delivered-${mode}`} className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Entregas realizadas
          </Label>
          <CountInput id={`delivered-${mode}`} name="delivered" placeholder="0" value={delivered} onValueChange={setDelivered} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`scheduled-${mode}`} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Agendadas (sem sucesso)
          </Label>
          <CountInput id={`scheduled-${mode}`} name="scheduled" placeholder="0" defaultValue={initial ? String(initial.scheduled) : ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`occurrences-${mode}`} className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Com ocorrência
          </Label>
          <CountInput id={`occurrences-${mode}`} name="occurrences" placeholder="0" defaultValue={initial ? String(initial.occurrences) : ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`expenses-${mode}`} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> Despesas do dia (R$)
          </Label>
          <MoneyInput id={`expenses-${mode}`} name="expenses" placeholder="0,00" value={expenses} onValueChange={setExpenses} />
        </div>
      </div>

      {/* Indicadores ao vivo, antes de salvar */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-secondary/40" aria-live="polite">
        <div className="min-w-0 px-2 py-3 @md:px-4">
          <p className="text-xs text-muted-foreground">Bruto</p>
          <p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground @md:text-base">{formatCurrency(tGross)}</p>
        </div>
        <div className="min-w-0 px-2 py-3 @md:px-4">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="mt-0.5 truncate font-mono text-sm font-semibold text-destructive @md:text-base">− {formatCurrency(tExpenses)}</p>
        </div>
        <div className="min-w-0 px-2 py-3 @md:px-4">
          <p className="text-xs font-semibold text-foreground">Líquido</p>
          <p className={`mt-0.5 truncate font-mono text-sm font-bold @md:text-lg ${netColor(tNet)}`}>{formatCurrency(tNet)}</p>
        </div>
      </div>

      <FormError message={error} />

      <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
        <Button type="submit" disabled={pending} className="w-full gap-2" size="lg">
          <Receipt className="h-4 w-4" aria-hidden="true" />
          {pending ? "Salvando..." : mode === "edit" ? "Salvar alterações" : "Salvar boleta"}
        </Button>
      </DialogFooter>

      <Dialog open={confirmFd !== null} onOpenChange={(o) => { if (!o) setConfirmFd(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Já existe boleta em {formatDate(String(confirmFd?.get("date") ?? ""))}</DialogTitle>
            <DialogDescription>Salvar agora substitui os números desse dia.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" autoFocus onClick={() => setConfirmFd(null)}>Cancelar</Button>
            <Button onClick={() => { const fd = confirmFd; setConfirmFd(null); if (fd) save(fd) }}>Substituir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

// ── Ações de uma boleta (editar + excluir) ───────────────────
function RecordActions({
  record, panel, onSave, onDelete, size = "icon",
}: { record: DailyRecord; panel: string; onSave: SaveAction; onDelete: DeleteAction; size?: "icon" | "sm" }) {
  const [editOpen, setEditOpen] = useState(false)
  const label = formatDate(record.date)
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {size === "sm" ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)} aria-label={`Editar boleta de ${label}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => setEditOpen(true)} aria-label={`Editar boleta de ${label}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <ConfirmDeleteButton itemLabel={`a boleta de ${label}`} onConfirm={() => onDelete(record.id)} />
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar boleta — {label}</DialogTitle>
            <DialogDescription>Altere os números do dia e salve.</DialogDescription>
          </DialogHeader>
          <RecordForm mode="edit" initial={record} panel={panel} onSave={onSave} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

type MonthSection = { month: number; rows: DailyRecord[]; all: DailyRecord[] }
type YearSection = { year: number; months: MonthSection[]; all: DailyRecord[] }

// ── Painel principal ──────────────────────────────────────────
export function DailyRecordsPanel({
  records, allRecords = records, filtered = false, showAnnual = true, panel = "jadlog", readOnly = false,
  onSave = saveDailyRecord, onDelete = deleteDailyRecord,
}: {
  /** Boletas do período escolhido na página. */
  records: DailyRecord[]
  /** Todas as boletas (datas já usadas e o último valor por entrega). */
  allRecords?: DailyRecord[]
  /** Há filtro de período ativo (muda a mensagem de vazio). */
  filtered?: boolean
  /** Mostra o resumo anual (some quando o filtro é de um mês só). */
  showAnnual?: boolean
  panel?: string
  readOnly?: boolean
  onSave?: SaveAction
  onDelete?: DeleteAction
}) {
  const [situation, setSituation] = useState<DeliveredFilter>("all")
  const [formKey, setFormKey] = useState(0)
  const existingDates = useMemo(() => new Set(allRecords.map((r) => r.date)), [allRecords])
  const defaultVpd = useMemo(() => lastValuePerDelivery(allRecords), [allRecords])

  // Ano (desc) → mês (desc) → dias (desc). Os resumos usam todas as boletas
  // do mês/ano no período; o filtro de situação só esconde linhas.
  const sections = useMemo<YearSection[]>(() => {
    const map = new Map<number, Map<number, DailyRecord[]>>()
    for (const r of records) {
      const d = new Date(r.date + "T00:00:00")
      const y = d.getFullYear(), m = d.getMonth()
      if (!map.has(y)) map.set(y, new Map())
      const ym = map.get(y)!
      if (!ym.has(m)) ym.set(m, [])
      ym.get(m)!.push(r)
    }
    return [...map.keys()].sort((a, b) => b - a).map((year) => {
      const ym = map.get(year)!
      const months = [...ym.keys()].sort((a, b) => b - a).map((month) => {
        const all = ym.get(month)!
        const rows = filterByDelivered(all, situation).sort((a, b) => (a.date < b.date ? 1 : -1))
        return { month, rows, all }
      })
      return { year, months, all: [...ym.values()].flat() }
    })
  }, [records, situation])

  const visibleCount = sections.reduce((s, y) => s + y.months.reduce((t, m) => t + m.rows.length, 0), 0)
  const cols = readOnly ? 8 : 9

  // Exporta o período da página (não o filtro de situação: quem exporta espera o período inteiro).
  function handleExport() {
    const csv = toCsv(records, [
      { key: "date", label: "Data" },
      { key: "delivered", label: "Entregas Realizadas" },
      { key: "scheduled", label: "Agendadas" },
      { key: "occurrences", label: "Ocorrências" },
      { key: (r) => Number(r.valuePerDelivery).toFixed(2), label: "Valor por Entrega" },
      { key: (r) => recordGross(r).toFixed(2), label: "Faturamento Bruto" },
      { key: (r) => Number(r.expenses).toFixed(2), label: "Despesas" },
      { key: (r) => recordNet(r).toFixed(2), label: "Faturamento Líquido" },
    ])
    downloadCsv(`boletas-${panel}-${localDateISO()}.csv`, csv)
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        {!readOnly && (
          <section className="mb-6 rounded-lg border border-border bg-card" aria-labelledby="new-boleta-title">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="new-boleta-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registrar boleta do dia
              </h2>
            </div>
            <div className="p-4">
              {/* key muda depois de salvar: o form volta limpo, com o valor por entrega da última boleta. */}
              <RecordForm
                key={formKey}
                mode="create"
                panel={panel}
                onSave={onSave}
                onDone={() => setFormKey((k) => k + 1)}
                existingDates={existingDates}
                defaultVpd={defaultVpd}
              />
            </div>
          </section>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Situação"
              value={situation}
              onChange={(e) => setSituation(e.target.value as DeliveredFilter)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-9 dark:bg-input/30"
            >
              <option value="all">Todas</option>
              <option value="with">Com entregas</option>
              <option value="without">Sem entregas</option>
            </select>
            {records.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Exportar CSV
              </Button>
            )}
          </div>
        </div>

        {allRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Nenhuma boleta registrada</p>
            {!readOnly && <p className="text-xs text-muted-foreground">Preencha o formulário acima para começar.</p>}
          </div>
        ) : visibleCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">
              {records.length === 0 && filtered ? "Nenhuma boleta no período" : "Nenhuma boleta com essa situação"}
            </p>
            <p className="text-xs text-muted-foreground">Mude o período ou a situação para ver outras boletas.</p>
          </div>
        ) : (
          <>
            {/* Celular: cartões por dia */}
            <div className="flex flex-col gap-4 sm:hidden">
              {sections.map((ys) => (
                <Fragment key={ys.year}>
                  {ys.months.map((ms) => ms.rows.length > 0 && (
                    <section key={`${ys.year}-${ms.month}`} aria-label={`${MONTHS[ms.month]} ${ys.year}`}>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{MONTHS[ms.month]} {ys.year}</h3>
                      <ul className="flex flex-col gap-2">
                        {ms.rows.map((r) => {
                          const n = recordNet(r)
                          return (
                            <li key={r.id} className="rounded-lg border border-border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="flex flex-wrap items-center gap-1.5 font-mono text-sm tabular-nums">
                                    {formatDate(r.date)}
                                    <span className="font-sans text-xs text-muted-foreground">{DAYS[dayOf(r.date)]}</span>
                                    {isWeekend(r.date) && <Badge variant="secondary" className="font-sans text-[10px]">fim de semana</Badge>}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <strong className="text-foreground">{r.delivered}</strong> entregas · {r.scheduled} agendadas · {r.occurrences} ocorr.
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className={`font-mono text-sm font-semibold tabular-nums ${netColor(n)}`}>{formatCurrency(n)}</p>
                                  <p className="text-[11px] text-muted-foreground">bruto {formatCurrency(recordGross(r))}</p>
                                </div>
                              </div>
                              {!readOnly && (
                                <div className="mt-2 border-t border-border pt-2">
                                  <RecordActions record={r} panel={panel} onSave={onSave} onDelete={onDelete} size="sm" />
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      <div className="mt-2"><SummaryCard label={`Resumo ${MONTHS[ms.month]} ${ys.year}`} records={ms.all} /></div>
                    </section>
                  ))}
                  {showAnnual && <SummaryCard label={`Resumo anual ${ys.year}`} records={ys.all} isAnnual />}
                </Fragment>
              ))}
            </div>

            {/* sm+: tabela */}
            <div className="hidden w-full rounded-lg border border-border sm:block">
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
                    {!readOnly && <TableHead className="text-right text-xs">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((ys) => (
                    <Fragment key={ys.year}>
                      {ys.months.map((ms) => ms.rows.length > 0 && (
                        <Fragment key={`${ys.year}-${ms.month}`}>
                          <TableRow className="border-t border-border">
                            <TableCell colSpan={cols} className="bg-secondary/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {MONTHS[ms.month]} {ys.year}
                            </TableCell>
                          </TableRow>
                          {ms.rows.map((r) => {
                            const g = recordGross(r), n = recordNet(r)
                            return (
                              <TableRow key={r.id} className="hover:bg-secondary/50">
                                <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                                  {formatDate(r.date)}
                                  <span className={`ml-2 text-[11px] font-medium ${isWeekend(r.date) ? "text-primary" : "text-muted-foreground"}`}>
                                    {DAYS[dayOf(r.date)]}
                                  </span>
                                  {isWeekend(r.date) && <span className="sr-only"> (fim de semana)</span>}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{r.delivered}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{r.scheduled}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{r.occurrences}</TableCell>
                                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(r.valuePerDelivery)}</TableCell>
                                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(g)}</TableCell>
                                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-destructive">− {formatCurrency(Number(r.expenses))}</TableCell>
                                <TableCell className={`whitespace-nowrap text-right font-mono font-semibold tabular-nums ${netColor(n)}`}>{formatCurrency(n)}</TableCell>
                                {!readOnly && (
                                  <TableCell className="text-right">
                                    <RecordActions record={r} panel={panel} onSave={onSave} onDelete={onDelete} />
                                  </TableCell>
                                )}
                              </TableRow>
                            )
                          })}
                          <SummaryRow label={`Resumo ${MONTHS[ms.month]} ${ys.year}`} records={ms.all} cols={cols} />
                        </Fragment>
                      ))}
                      {showAnnual && <SummaryRow label={`Resumo anual ${ys.year}`} records={ys.all} isAnnual cols={cols} />}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
