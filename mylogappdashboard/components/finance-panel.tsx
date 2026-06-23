"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { Transaction } from "@/lib/db/schema"
import { createTransaction, deleteTransaction } from "@/app/actions/transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"

export function FinancePanel({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTransaction(formData)
      setOpen(false)
    })
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Lançamentos financeiros</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Novo lançamento
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
                <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
              </DialogHeader>
              <form action={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select name="type" defaultValue="receita">
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0,00" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" required placeholder="Ex: Frete entrega São Paulo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input id="category" name="category" placeholder="Frete, Combustível..." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Salvando..." : "Salvar lançamento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {transactions.length === 0 ? (
          <EmptyState />
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
                {transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [isPending, startTransition] = useTransition()
  const isReceita = transaction.type === "receita"

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
      <TableCell className="font-medium">{transaction.description}</TableCell>
      <TableCell className="text-muted-foreground">{transaction.category || "—"}</TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            isReceita ? "text-[var(--chart-2)]" : "text-destructive"
          }`}
        >
          {isReceita ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {isReceita ? "Receita" : "Despesa"}
        </span>
      </TableCell>
      <TableCell
        className={`text-right font-semibold ${isReceita ? "text-[var(--chart-2)]" : "text-destructive"}`}
      >
        {isReceita ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => startTransition(() => deleteTransaction(transaction.id))}
          aria-label="Excluir lançamento"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Nenhum lançamento registrado</p>
      <p className="text-xs text-muted-foreground">Clique em &quot;Novo lançamento&quot; para começar.</p>
    </div>
  )
}
