"use client"

import { toast } from "sonner"
import { useMemo, useState } from "react"
import { Trash2 } from "lucide-react"
import { adminDeleteAuditLogEntry } from "@/app/actions/admin-override"
import { ConfirmButton } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { auditEntityPlural, auditFieldLabel, formatAuditValue, formatDateTime } from "@/lib/audit-format"

const ACTION_LABELS: Record<string, string> = { create: "criou", update: "editou", delete: "excluiu" }
export type LogEntry = {
  id: number
  entityType: string
  entityId: number
  action: string
  fieldChanges: unknown
  /** Montado no servidor (auditItemLabel): as fotos do registro não vêm ao navegador. */
  itemLabel: string
  createdAt: Date
  actorName: string
  actorUserId: number
  /** Só na visão global do admin master (D10). */
  orgName?: string
}

export function AuditLogRow({ log, canDelete = false, onRemoved }: { log: LogEntry; canDelete?: boolean; onRemoved?: () => void }) {
  const changes = Array.isArray(log.fieldChanges) ? log.fieldChanges as { field: string; old: unknown; new: unknown }[] : []
  const item = log.itemLabel

  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="text-foreground">
          <strong>{log.actorName}</strong> {ACTION_LABELS[log.action] ?? log.action} {item}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={new Date(log.createdAt).toISOString()}>{formatDateTime(log.createdAt)}</time>
          {log.orgName && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{log.orgName}</span>}
        </p>
        {changes.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {changes.map((c, i) => (
              <li key={i}>
                {auditFieldLabel(c.field)}: <span className="line-through">{formatAuditValue(c.field, c.old)}</span>
                {" → "}
                <span className="font-medium text-foreground">{formatAuditValue(c.field, c.new)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canDelete && (
        <ConfirmButton
          title="Excluir esta entrada de auditoria?"
          description="A exclusão também fica registrada, com você como autor. Essa ação não pode ser desfeita."
          onConfirm={() => adminDeleteAuditLogEntry(log.id)}
          onDone={() => { toast.success("Entrada de auditoria excluída"); onRemoved?.() }}
          buttonProps={{
            variant: "ghost", size: "icon", className: "h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive",
            "aria-label": `Excluir entrada: ${log.actorName} ${ACTION_LABELS[log.action] ?? log.action} ${item}`,
            title: "Excluir entrada de auditoria (ADMIN MASTER) — fica registrado quem excluiu",
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ConfirmButton>
      )}
    </li>
  )
}

const PAGE = 50
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

/** Lista com filtro por autor e por tipo, 50 por vez. */
export function AuditLogList({ logs, canDelete = false }: { logs: LogEntry[]; canDelete?: boolean }) {
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [actor, setActor] = useState("all")
  const [entity, setEntity] = useState("all")
  const [limit, setLimit] = useState(PAGE)

  // Chave = id do autor: dois usuários com o mesmo nome não viram uma opção só.
  const actors = useMemo(() => {
    const byId = new Map<number, string>()
    for (const l of logs) byId.set(l.actorUserId, l.actorName)
    return [...byId].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
  }, [logs])
  const dupNames = useMemo(() => {
    const seen = new Map<string, number>()
    for (const [, name] of actors) seen.set(name, (seen.get(name) ?? 0) + 1)
    return seen
  }, [actors])
  const entities = useMemo(() => Array.from(new Set(logs.map((l) => l.entityType))), [logs])
  const visible = useMemo(
    () => logs.filter((l) => !removed.has(l.id) && (actor === "all" || String(l.actorUserId) === actor) && (entity === "all" || l.entityType === entity)),
    [logs, removed, actor, entity],
  )

  if (logs.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma edição registrada ainda.</p>

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="Quem fez" className={selectClass} value={actor} onChange={(e) => { setActor(e.target.value); setLimit(PAGE) }}>
          <option value="all">Todas as pessoas</option>
          {actors.map(([id, name]) => (
            <option key={id} value={id}>{(dupNames.get(name) ?? 0) > 1 ? `${name} (#${id})` : name}</option>
          ))}
        </select>
        <select aria-label="Tipo de registro" className={selectClass} value={entity} onChange={(e) => { setEntity(e.target.value); setLimit(PAGE) }}>
          <option value="all">Todos os tipos</option>
          {entities.map((e) => <option key={e} value={e}>{auditEntityPlural(e)}</option>)}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {actor === "all" && entity === "all" ? "Nenhuma edição registrada ainda." : "Nenhuma edição com esse filtro."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visible.slice(0, limit).map((log) => (
              <AuditLogRow
                key={log.id}
                log={log}
                canDelete={canDelete}
                onRemoved={() => setRemoved((s) => new Set(s).add(log.id))}
              />
            ))}
          </ul>
          {visible.length > limit && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                Mostrar mais ({visible.length - limit} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}
