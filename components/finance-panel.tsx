"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { Transaction } from "@/lib/db/schema"
import { createTransaction, deleteTransaction, updateTransaction } from "@/app/actions/transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"

function TransactionForm({ initial, onClose, panel = "jadlog" }: { initial?: Transaction; onClose: () => void; panel?: string }) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState(initial?.type ?? "receita")

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      if (initial) { fd.append("id", String(initial.id)); await updateTransaction(fd) }
      else await createTransaction(fd)
      onClose()
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <input type="hidden" name="panel" value={panel} />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" value={type} onValueChange={setType}>
            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0,00"
            defaultValue={initial ? Number(initial.amount).toFixed(2) : ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" required placeholder="Ex: Combustível"
          defaultValue={initial?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" name="category" placeholder="Frete, Combustível..."
            defaultValue={initial?.category ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date"
            defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : initial ? "Salvar alterações" : "Salvar lançamento"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function TransactionRow({ transaction, panel = "jadlog" }: { transaction: Transaction; panel?: string }) {
  const [editOpen, setEditOpen]      = useState(false)
  const [isPending, startTransition] = useTransition()
  const isReceita = transaction.type === "receita"

  return (
    <>
      <TableRow>
        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
        <TableCell className="font-medium">{transaction.description}</TableCell>
        <TableCell className="text-muted-foreground">{transaction.category || "—"}</TableCell>
        <TableCell>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${isReceita ? "text-[var(--chart-2)]" : "text-destructive"}`}>
            {isReceita ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isReceita ? "Receita" : "Despesa"}
          </span>
        </TableCell>
        <TableCell className={`text-right font-mono font-semibold whitespace-nowrap ${isReceita ? "text-[var(--chart-2)]" : "text-destructive"}`}>
          {isReceita ? "+" : "−"}{formatCurrency(transaction.amount)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isPending} onClick={() => startTransition(() => deleteTransaction(transaction.id))}
              aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lançamento</DialogTitle>
            <DialogDescription>Altere os dados e salve.</DialogDescription>
          </DialogHeader>
          <TransactionForm initial={transaction} onClose={() => setEditOpen(false)} panel={panel} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FinancePanel({
  transactions, panel = "jadlog", year, month, onYearChange, onMonthChange,
}: {
  transactions: Transaction[]
  panel?: string
  year: number | null
  month: number | null
  onYearChange: (year: number | null) => void
  onMonthChange: (month: number | null) => void
}) {
  const [open, setOpen] = useState(false)

  const allYears = useMemo(() =>
    Array.from(new Set(transactions.map(t => new Date(t.date + "T00:00:00").getFullYear()))).sort((a, b) => b - a),
    [transactions])

  const monthsForSelect = useMemo(() => {
    const source = year === null ? transactions : transactions.filter(t => new Date(t.date + "T00:00:00").getFullYear() === year)
    return Array.from(new Set(source.map(t => new Date(t.date + "T00:00:00").getMonth()))).sort((a, b) => a - b)
  }, [transactions, year])

  const filtered = useMemo(() => {
    if (year === null && month === null) return transactions
    return transactions.filter(t => {
      const d = new Date(t.date + "T00:00:00")
      if (year !== null && d.getFullYear() !== year) return false
      if (month !== null && d.getMonth() !== month) return false
      return true
    })
  }, [transactions, year, month])

  const receita = filtered.filter(t => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0)
  const despesa = filtered.filter(t => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0)
  const saldo   = receita - despesa

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        {/* Resumo rápido */}
        <div className="mb-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-secondary/30">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Total receitas</p>
            <p className="font-mono text-base font-bold text-[var(--chart-2)]">{formatCurrency(receita)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Total despesas</p>
            <p className="font-mono text-base font-bold text-destructive">{formatCurrency(despesa)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-foreground">Saldo</p>
            <p className={`font-mono text-lg font-bold ${saldo >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
              {formatCurrency(saldo)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Lançamentos financeiros</h2>
            <select
              value={year ?? ""}
              onChange={e => onYearChange(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">Todos os anos</option>
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={month ?? ""}
              onChange={e => onMonthChange(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">Todos os meses</option>
              {monthsForSelect.map(m => <option key={m} value={m}>{MONTHS[m]}</option>)}
            </select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />Novo lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
                <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
              </DialogHeader>
              <TransactionForm onClose={() => setOpen(false)} panel={panel} />
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {transactions.length === 0 ? "Nenhum lançamento registrado" : "Nenhum lançamento no período selecionado"}
            </p>
            <p className="text-xs text-muted-foreground">Clique em &quot;Novo lançamento&quot; para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => <TransactionRow key={t.id} transaction={t} panel={panel} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
