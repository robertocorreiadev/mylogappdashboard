"use client"

import { toast } from "sonner"
import { useState, useTransition } from "react"
import { Plus, Pencil, TrendingUp, TrendingDown, Wallet, Download } from "lucide-react"
import type { Transaction } from "@/lib/db/schema"
import { FormError } from "@/components/form-error"
import { MoneyInput } from "@/components/money-input"
import type { ActionResult } from "@/lib/forms"
import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { localDateISO } from "@/lib/dates"
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
import { formatCurrency, formatDate } from "@/lib/format"
import { toCsv, downloadCsv } from "@/lib/csv"

// D12: as actions devolvem { error } em vez de lançar; o form mostra o erro.
type CreateAction = (formData: FormData) => Promise<ActionResult>
type UpdateAction = (formData: FormData) => Promise<ActionResult>
type DeleteAction = (id: number) => Promise<void>

function TransactionForm({
  initial, onClose, panel = "jadlog", onCreate = createTransaction, onUpdate = updateTransaction,
}: { initial?: Transaction; onClose: () => void; panel?: string; onCreate?: CreateAction; onUpdate?: UpdateAction }) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState(initial?.type ?? "receita")
  const [error, setError] = useState<string | null>(null)

  // onSubmit + preventDefault, não `action`: o React 19 limpa os campos depois
  // de uma `action`, e com erro o usuário perderia o que digitou.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      let res: ActionResult
      if (initial) { fd.append("id", String(initial.id)); res = await onUpdate(fd) }
      else res = await onCreate(fd)
      if (res?.error) { setError(res.error); return }
      toast.success(initial ? "Lançamento atualizado" : "Lançamento salvo")
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="panel" value={panel} />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" value={type} onValueChange={(value) => setType(value ?? "receita")}>
            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <MoneyInput id="amount" name="amount" required placeholder="0,00"
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
            defaultValue={initial?.date ?? localDateISO()} />
        </div>
      </div>
      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : initial ? "Salvar alterações" : "Salvar lançamento"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function TransactionRow({
  transaction, panel = "jadlog", readOnly = false,
  onCreate = createTransaction, onUpdate = updateTransaction, onDelete = deleteTransaction,
}: {
  transaction: Transaction
  panel?: string
  readOnly?: boolean
  onCreate?: CreateAction
  onUpdate?: UpdateAction
  onDelete?: DeleteAction
}) {
  const [editOpen, setEditOpen]      = useState(false)
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
        {!readOnly && (
        <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => setEditOpen(true)} aria-label={`Editar lançamento ${transaction.description}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmDeleteButton
                itemLabel={`o lançamento "${transaction.description}"`}
                onConfirm={() => onDelete(transaction.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                iconClassName="h-4 w-4"
              />
            </div>
        </TableCell>
        )}
      </TableRow>
      {!readOnly && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar lançamento</DialogTitle>
              <DialogDescription>Altere os dados e salve.</DialogDescription>
            </DialogHeader>
            <TransactionForm initial={transaction} onClose={() => setEditOpen(false)} panel={panel} onCreate={onCreate} onUpdate={onUpdate} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export function FinancePanel({
  transactions, hasAny = transactions.length > 0, panel = "jadlog", readOnly = false,
  onCreate = createTransaction, onUpdate = updateTransaction, onDelete = deleteTransaction,
}: {
  /** Lançamentos do período escolhido na página (filtro de DashboardTabs). */
  transactions: Transaction[]
  /** Existe algum lançamento, fora do período? (muda a mensagem de vazio) */
  hasAny?: boolean
  panel?: string
  readOnly?: boolean
  onCreate?: CreateAction
  onUpdate?: UpdateAction
  onDelete?: DeleteAction
}) {
  const [open, setOpen] = useState(false)
  const filtered = transactions

  function handleExport() {
    const csv = toCsv(filtered, [
      { key: "date", label: "Data" },
      { key: "description", label: "Descrição" },
      { key: (t) => t.category ?? "", label: "Categoria" },
      { key: (t) => (t.type === "receita" ? "Receita" : "Despesa"), label: "Tipo" },
      { key: (t) => Number(t.amount).toFixed(2), label: "Valor" },
    ])
    downloadCsv(`financeiro-${panel}-${localDateISO()}.csv`, csv)
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Lançamentos financeiros</h2>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Exportar CSV
              </Button>
            )}
            {!readOnly && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button size="sm" className="gap-2" />}>
                  <Plus className="h-4 w-4" />Novo lançamento
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo lançamento</DialogTitle>
                    <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
                  </DialogHeader>
                  <TransactionForm onClose={() => setOpen(false)} panel={panel} onCreate={onCreate} onUpdate={onUpdate} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {!hasAny ? "Nenhum lançamento registrado" : "Nenhum lançamento no período selecionado"}
            </p>
            {!readOnly && <p className="text-xs text-muted-foreground">Clique em &quot;Novo lançamento&quot; para começar.</p>}
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
                  {!readOnly && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TransactionRow key={t.id} transaction={t} panel={panel} readOnly={readOnly} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
