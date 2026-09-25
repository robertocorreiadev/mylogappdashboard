"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { adminDeleteAuditLogEntry } from "@/app/actions/admin-override"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"

const ENTITY_LABELS: Record<string, string> = {
  daily_record: "boleta diária",
  delivery: "entrega",
  transaction: "lançamento financeiro",
  audit_log_entry: "entrada de auditoria",
}
const ACTION_LABELS: Record<string, string> = { create: "criou", update: "editou", delete: "excluiu" }

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    delivered: "entregas realizadas", scheduled: "agendadas", occurrences: "ocorrências",
    valuePerDelivery: "valor por entrega", expenses: "despesas", status: "status",
    value: "valor", amount: "valor", type: "tipo", description: "descrição", category: "categoria",
    date: "data", deadline: "prazo", recipient: "destinatário", address: "endereço", city: "cidade",
    trackingCode: "código de rastreio",
  }
  return labels[field] ?? field
}

type LogEntry = {
  id: number
  entityType: string
  entityId: number
  action: string
  fieldChanges: unknown
  createdAt: Date
  actorName: string
}

export function AuditLogRow({ log, canDelete = false }: { log: LogEntry; canDelete?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)
  const changes = Array.isArray(log.fieldChanges) ? log.fieldChanges as { field: string; old: unknown; new: unknown }[] : []

  if (removed) return null

  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div>
        <p className="text-foreground">
          <strong>{log.actorName}</strong>{" "}
          {ACTION_LABELS[log.action] ?? log.action}{" "}
          {ENTITY_LABELS[log.entityType] ?? log.entityType} #{log.entityId}
          <span className="ml-2 text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
        </p>
        {changes.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {changes.map((c, i) => (
              <li key={i}>
                {fieldLabel(c.field)}: <span className="line-through">{String(c.old)}</span>
                {" → "}
                <span className="font-medium text-foreground">{String(c.new)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canDelete && (
        <Button
          variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            const res = await adminDeleteAuditLogEntry(log.id)
            if (res?.success) setRemoved(true)
          })}
          aria-label="Excluir entrada (ADMIN MASTER)"
          title="Excluir entrada de auditoria (ADMIN MASTER) — fica registrado quem excluiu"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  )
}
