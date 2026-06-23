"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, Package } from "lucide-react"
import type { Delivery } from "@/lib/db/schema"
import { createDelivery, deleteDelivery, updateDeliveryStatus } from "@/app/actions/deliveries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { formatCurrency, formatDate, statusLabel, STATUS_OPTIONS } from "@/lib/format"

const statusStyles: Record<string, string> = {
  pendente: "bg-secondary text-muted-foreground",
  em_transito: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  entregue: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]",
  cancelada: "bg-destructive/15 text-destructive",
}

export function DeliveriesPanel({ deliveries }: { deliveries: Delivery[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createDelivery(formData)
      setOpen(false)
    })
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Entregas</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nova entrega
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova entrega</DialogTitle>
                <DialogDescription>Cadastre um novo pacote para acompanhamento.</DialogDescription>
              </DialogHeader>
              <form action={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trackingCode">Código de rastreio</Label>
                  <Input id="trackingCode" name="trackingCode" required placeholder="JL123456789BR" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recipient">Destinatário</Label>
                  <Input id="recipient" name="recipient" required placeholder="Nome do cliente" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="city" placeholder="São Paulo" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Valor (R$)</Label>
                    <Input id="value" name="value" type="number" step="0.01" min="0" placeholder="0,00" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" name="address" placeholder="Rua, número, bairro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="deadline">Prazo</Label>
                    <Input id="deadline" name="deadline" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="pendente">
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Salvando..." : "Salvar entrega"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {deliveries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <DeliveryRow key={d.id} delivery={d} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const [isPending, startTransition] = useTransition()

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{delivery.trackingCode}</TableCell>
      <TableCell className="font-medium">{delivery.recipient}</TableCell>
      <TableCell className="text-muted-foreground">{delivery.city || "—"}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(delivery.deadline)}</TableCell>
      <TableCell>{formatCurrency(delivery.value)}</TableCell>
      <TableCell>
        <Select
          defaultValue={delivery.status}
          onValueChange={(v) => startTransition(() => updateDeliveryStatus(delivery.id, String(v)))}
        >
          <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent p-0 focus:ring-0">
            <Badge className={`${statusStyles[delivery.status] ?? ""} border-0`}>
              {statusLabel(delivery.status)}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDelivery(delivery.id))}
          aria-label="Excluir entrega"
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
      <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Nenhuma entrega cadastrada</p>
      <p className="text-xs text-muted-foreground">Clique em &quot;Nova entrega&quot; para começar.</p>
    </div>
  )
}
