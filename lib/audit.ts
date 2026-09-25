// Histórico append-only das edições que o entregador faz nos próprios
// registros — visível ao gestor para transparência/rastreabilidade. Nenhuma
// UI normal edita ou apaga uma linha de audit_logs (ver seção 5 do plano
// multi-tenant); a única exceção é o modo ADMIN MASTER
// (app/actions/admin-override.ts adminDeleteAuditLogEntry), que sempre grava
// um meta-registro ("audit_log_entry") documentando a própria exclusão.
import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

type EntityType = "daily_record" | "delivery" | "transaction" | "audit_log_entry"
type AuditAction = "create" | "update" | "delete"

// Colunas de housekeeping que não interessam no diff (sempre mudam, não são
// "o que o entregador alterou").
const IGNORED_FIELDS = new Set(["id", "userId", "organizationId", "panel", "createdAt", "updatedAt"])

function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const changes: { field: string; old: unknown; new: unknown }[] = []
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue
    const oldVal = before?.[key] ?? null
    const newVal = after?.[key] ?? null
    if (String(oldVal) !== String(newVal)) changes.push({ field: key, old: oldVal, new: newVal })
  }
  return changes
}

export async function recordAudit({
  organizationId, actorUserId, entityType, entityId, action, before, after,
}: {
  organizationId: number
  actorUserId: number
  entityType: EntityType
  entityId: number
  action: AuditAction
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}) {
  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    entityType,
    entityId,
    action,
    fieldChanges: action === "update" ? diffFields(before ?? null, after ?? null) : null,
    snapshotBefore: before ?? null,
    snapshotAfter: after ?? null,
  })
}
