"use client"

import { toast } from "sonner"
import { useMemo, useState, useTransition } from "react"
import { Plus, Package, Download, Pencil, Search } from "lucide-react"
import type { Delivery } from "@/lib/db/schema"
import { FormError } from "@/components/form-error"
import type { ActionResult } from "@/lib/forms"
import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { MoneyInput } from "@/components/money-input"
import { localDateISO } from "@/lib/dates"
import { filterPackages } from "@/lib/package-filter"
import { createDelivery, deleteDelivery, updateDelivery, updateDeliveryStatus } from "@/app/actions/deliveries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, statusLabel, STATUS_OPTIONS } from "@/lib/format"
import { toCsv, downloadCsv } from "@/lib/csv"
import { cn } from "@/lib/utils"

// D12: as actions de form devolvem { error } em vez de lançar; o form mostra o erro.
type CreateAction = (formData: FormData) => Promise<ActionResult>
type UpdateAction = (formData: FormData) => Promise<ActionResult>
type UpdateStatusAction = (id: number, status: string) => Promise<void>
type DeleteAction = (id: number) => Promise<void>

const statusStyles: Record<string, string> = {
  pendente: "bg-secondary text-muted-foreground",
  em_transito: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  entregue: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]",
  cancelada: "bg-destructive/15 text-destructive",
}

// ── Formulário (novo e editar) ──────────────────────────────
function PackageForm({
  initial, panel, onSubmitAction, onDone,
}: { initial?: Delivery; panel: string; onSubmitAction: CreateAction | UpdateAction; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const idp = initial ? `-${initial.id}` : "-new"

  // onSubmit + preventDefault, não `action`: o React 19 limpa os campos depois
  // de uma `action`, e com erro o usuário perderia o que digitou.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (initial) fd.set("id", String(initial.id))
    setError(null)
    startTransition(async () => {
      const res = await onSubmitAction(fd)
      if (res?.error) { setError(res.error); return }
      toast.success(initial ? "Pacote atualizado" : "Pacote cadastrado")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="panel" value={panel} />
      <div className="grid gap-2">
        <Label htmlFor={`trackingCode${idp}`}>Código de rastreio</Label>
        <Input id={`trackingCode${idp}`} name="trackingCode" required placeholder="JL123456789BR" autoCapitalize="characters" defaultValue={initial?.trackingCode ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`recipient${idp}`}>Destinatário</Label>
        <Input id={`recipient${idp}`} name="recipient" required placeholder="Nome do cliente" defaultValue={initial?.recipient ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`city${idp}`}>Cidade</Label>
          <Input id={`city${idp}`} name="city" placeholder="São Paulo" defaultValue={initial?.city ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`value${idp}`}>Valor (R$)</Label>
          <MoneyInput id={`value${idp}`} name="value" placeholder="0,00" defaultValue={initial ? Number(initial.value).toFixed(2) : ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`address${idp}`}>Endereço</Label>
        <Input id={`address${idp}`} name="address" placeholder="Rua, número, bairro" defaultValue={initial?.address ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`deadline${idp}`}>Prazo</Label>
          <Input id={`deadline${idp}`} name="deadline" type="date" defaultValue={initial?.deadline ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`status${idp}`}>Status</Label>
          <Select name="status" defaultValue={initial?.status ?? "pendente"}>
            <SelectTrigger id={`status${idp}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <FormError message={error} />
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : initial ? "Salvar alterações" : "Salvar pacote"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DeliveriesPanel({
  deliveries, panel = "jadlog", readOnly = false,
  onCreate = createDelivery, onUpdate = updateDelivery, onUpdateStatus = updateDeliveryStatus, onDelete = deleteDelivery,
}: {
  deliveries: Delivery[]
  panel?: string
  readOnly?: boolean
  onCreate?: CreateAction
  onUpdate?: UpdateAction
  onUpdateStatus?: UpdateStatusAction
  onDelete?: DeleteAction
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const visible = useMemo(() => filterPackages(deliveries, query, status), [deliveries, query, status])

  function handleExport() {
    const csv = toCsv(deliveries, [
      { key: "trackingCode", label: "Código de Rastreio" },
      { key: "recipient", label: "Destinatário" },
      { key: "city", label: "Cidade" },
      { key: "address", label: "Endereço" },
      { key: (d) => d.deadline ?? "", label: "Prazo" },
      { key: (d) => Number(d.value).toFixed(2), label: "Valor" },
      { key: (d) => statusLabel(d.status), label: "Status" },
    ])
    downloadCsv(`entregas-${panel}-${localDateISO()}.csv`, csv)
  }

  const chips = [{ value: "all", label: "Todos" }, ...STATUS_OPTIONS]

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Pacotes</h2>
          <div className="flex items-center gap-2">
            {deliveries.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Exportar CSV
              </Button>
            )}
            {!readOnly && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button size="sm" className="gap-2" />}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Novo pacote
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Novo pacote</DialogTitle>
                    <DialogDescription>Cadastre um pacote para acompanhar a entrega.</DialogDescription>
                  </DialogHeader>
                  <PackageForm panel={panel} onSubmitAction={onCreate} onDone={() => setOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nenhum pacote cadastrado</p>
            {!readOnly && <p className="text-xs text-muted-foreground">Clique em &quot;Novo pacote&quot; para começar.</p>}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  aria-label="Buscar pacote"
                  placeholder="Buscar código, destinatário ou cidade"
                  className="pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
                {chips.map((c) => (
                  <Button
                    key={c.value}
                    size="sm"
                    variant={status === c.value ? "default" : "outline"}
                    aria-pressed={status === c.value}
                    onClick={() => setStatus(c.value)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pacote encontrado com essa busca.</p>
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
                      {!readOnly && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((d) => (
                      <PackageRow key={d.id} delivery={d} panel={panel} readOnly={readOnly} onUpdate={onUpdate} onUpdateStatus={onUpdateStatus} onDelete={onDelete} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PackageRow({
  delivery, panel, readOnly, onUpdate, onUpdateStatus, onDelete,
}: {
  delivery: Delivery; panel: string; readOnly: boolean
  onUpdate: UpdateAction; onUpdateStatus: UpdateStatusAction; onDelete: DeleteAction
}) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  // Status controlado: muda na hora; se o servidor falhar, volta ao anterior.
  const [status, setStatus] = useState(delivery.status)
  const [synced, setSynced] = useState(delivery.status)
  if (delivery.status !== synced) { setSynced(delivery.status); setStatus(delivery.status) }

  function changeStatus(next: string) {
    const previous = status
    setStatus(next)
    startTransition(async () => {
      try {
        await onUpdateStatus(delivery.id, next)
        toast.success(`Status: ${statusLabel(next)}`)
      } catch {
        setStatus(previous)
        toast.error("Não foi possível mudar o status. Atualize a página e tente de novo.")
      }
    })
  }

  const badge = (
    <Badge className={cn(statusStyles[status] ?? "", "border-0")}>{statusLabel(status)}</Badge>
  )

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{delivery.trackingCode}</TableCell>
      <TableCell className="font-medium">{delivery.recipient}</TableCell>
      <TableCell className="text-muted-foreground">{delivery.city || "—"}</TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(delivery.deadline)}</TableCell>
      <TableCell className="whitespace-nowrap">{formatCurrency(delivery.value)}</TableCell>
      <TableCell>
        {readOnly ? badge : (
          <Select value={status} onValueChange={(v) => v && v !== status && changeStatus(String(v))} disabled={isPending}>
            <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent p-0 focus:ring-0" aria-label={`Status do pacote ${delivery.trackingCode}`}>
              {badge}
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      {!readOnly && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)} aria-label={`Editar pacote ${delivery.trackingCode}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              itemLabel={`o pacote ${delivery.trackingCode}`}
              onConfirm={() => onDelete(delivery.id)}
              disabled={isPending}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              iconClassName="h-4 w-4"
            />
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar pacote — {delivery.trackingCode}</DialogTitle>
                <DialogDescription>Altere os dados do pacote e salve.</DialogDescription>
              </DialogHeader>
              <PackageForm initial={delivery} panel={panel} onSubmitAction={onUpdate} onDone={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
        </TableCell>
      )}
    </TableRow>
  )
}
