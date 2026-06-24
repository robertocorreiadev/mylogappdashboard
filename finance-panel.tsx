"use client"

import { useState, useTransition } from "react"
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
import { formatCurrency, formatDate } from "@/lib/format"

// ── Formulário reutilizável (criar e editar) ─────────────────
function TransactionForm({
  initial,
  onClose,
}: {
  initial?: Transaction
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState(initial?.type ?? "receita")

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      if (initial) {
        fd.append("id", String(initial.id))
        await updateTransaction(fd)
      } else {
        await createTransaction(fd)
      }
      onClose()
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
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
          <Input
            id="amount" name="amount" type="number" step="0.01" min="0"
            required placeholder="0,00"
            defaultValue={initial ? Number(initial.amount).toFixed(2) : ""}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description" name="description" required
          placeholder="Ex: Frete entrega São Paulo"
          defaultValue={initial?.description ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category" name="category"
            placeholder="Frete, Combustível..."
            defaultValue={initial?.category ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date" name="date" type="date"
            defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
          />
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

// ── Linha com botões editar/excluir ──────────────────────────
function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [editOpen, setEditOpen]    = useState(false)
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
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)}
              aria-label="Editar lançamento"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={() => startTransition(() => deleteTransaction(transaction.id))}
              aria-label="Excluir lançamento"
            >
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
          <TransactionForm initial={transaction} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Painel principal ─────────────────────────────────────────
export function FinancePanel({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false)

  const receita = transactions.filter(t => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0)
  const despesa = transactions.filter(t => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0)
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

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Lançamentos financeiros</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Novo lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
                <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
              </DialogHeader>
              <TransactionForm onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nenhum lançamento registrado</p>
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
                {transactions.map(t => <TransactionRow key={t.id} transaction={t} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
