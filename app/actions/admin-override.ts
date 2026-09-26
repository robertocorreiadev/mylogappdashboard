"use server"

// Modo ADMIN MASTER: só o super-admin (ADMIN_EMAIL, requireAdmin()) chega
// aqui. Estas actions espelham as de app/actions/daily-records.ts /
// deliveries.ts / transactions.ts, mas recebem organizationId/targetUserId
// explícitos em vez de inferir do usuário logado — de propósito NUNCA
// reaproveitam nem modificam as actions normais de entregador, para não
// arriscar a garantia de isolamento de tenant que já está testada.
//
// Toda escrita aqui grava auditoria com actorUserId = o próprio admin, para
// nunca virar caixa-preta (visível em /gestor/auditoria da organização do
// alvo, junto com as edições do entregador).
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { memberships, users, organizations, auditLogs } from "@/lib/db/schema"
import { requireAdmin } from "@/app/actions/auth"
import {
  dailyRecordsForUserAllPanels, findDailyRecord, insertDailyRecord, updateDailyRecordById, deleteDailyRecordById,
  deliveriesForUserAllPanels, findDeliveryById, insertDelivery, updateDeliveryStatusById, deleteDeliveryById,
  transactionsForUserAllPanels, findTransactionById, insertTransaction, updateTransactionById, deleteTransactionById,
} from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"
import { panelLabel, PANEL_LABELS } from "@/lib/format"

// Busca o alvo em QUALQUER organização (não restringe à org do admin) —
// é exatamente isso que distingue o modo admin do drill-down normal do
// gestor (app/actions/gestor.ts getMemberDashboardData, restrito à mesma org).
export async function adminGetTargetMemberData(targetUserId: number) {
  await requireAdmin()

  const [member] = await db.select({
    organizationId: memberships.organizationId,
    name: users.name,
    email: users.email,
    orgName: organizations.name,
  })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, targetUserId), eq(memberships.role, "entregador"), eq(memberships.status, "active")))
    .limit(1)

  if (!member) return null

  const [dailyRecords, deliveries, transactions] = await Promise.all([
    dailyRecordsForUserAllPanels({ organizationId: member.organizationId, userId: targetUserId }),
    deliveriesForUserAllPanels({ organizationId: member.organizationId, userId: targetUserId }),
    transactionsForUserAllPanels({ organizationId: member.organizationId, userId: targetUserId }),
  ])

  const panelKeys = Array.from(new Set([
    ...Object.keys(PANEL_LABELS),
    ...dailyRecords.map((r) => r.panel),
    ...deliveries.map((d) => d.panel),
    ...transactions.map((t) => t.panel),
  ]))

  const panels = panelKeys.map((panel) => ({
    panel,
    label: panelLabel(panel),
    dailyRecords: dailyRecords.filter((r) => r.panel === panel),
    deliveries: deliveries.filter((d) => d.panel === panel),
    transactions: transactions.filter((t) => t.panel === panel),
  }))

  return {
    member: { name: member.name, email: member.email },
    organizationId: member.organizationId,
    orgName: member.orgName ?? "—",
    panels,
  }
}

// ── Boleta diária ────────────────────────────────────────────────────────

export async function adminSaveDailyRecord(organizationId: number, targetUserId: number, formData: FormData) {
  const admin = await requireAdmin()
  const panel            = formData.get("panel")?.toString() || "jadlog"
  const date              = formData.get("date")?.toString() || ""
  const valuePerDelivery  = formData.get("valuePerDelivery")?.toString() || "3.50"
  const delivered         = parseInt(formData.get("delivered")?.toString() || "0") || 0
  const scheduled         = parseInt(formData.get("scheduled")?.toString() || "0") || 0
  const occurrences       = parseInt(formData.get("occurrences")?.toString() || "0") || 0
  const expensesRaw       = formData.get("expenses")?.toString() || ""
  const expenses          = expensesRaw.trim() === "" ? "0" : expensesRaw

  if (!date) return { error: "Selecione uma data." }

  const existing = await findDailyRecord({ organizationId, userId: targetUserId, panel, date })

  if (existing) {
    const updated = await updateDailyRecordById(
      { organizationId, userId: targetUserId, id: existing.id },
      { valuePerDelivery, delivered, scheduled, occurrences, expenses, updatedAt: new Date() },
    )
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "daily_record", entityId: existing.id,
      action: "update", before: existing, after: updated,
    })
  } else {
    const created = await insertDailyRecord({
      userId: targetUserId, organizationId, panel, date, valuePerDelivery, delivered, scheduled, occurrences, expenses,
    })
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "daily_record", entityId: created.id,
      action: "create", before: null, after: created,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
  return { success: true }
}

export async function adminDeleteDailyRecord(organizationId: number, targetUserId: number, id: number) {
  const admin = await requireAdmin()
  const deleted = await deleteDailyRecordById({ organizationId, userId: targetUserId, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "daily_record", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

// ── Entregas ─────────────────────────────────────────────────────────────

export async function adminCreateDelivery(organizationId: number, targetUserId: number, formData: FormData) {
  const admin = await requireAdmin()
  const panel        = formData.get("panel")?.toString() || "jadlog"
  const trackingCode = formData.get("trackingCode")?.toString().trim() || ""
  const recipient     = formData.get("recipient")?.toString().trim() || ""
  const address       = formData.get("address")?.toString().trim() || null
  const city          = formData.get("city")?.toString().trim() || null
  const status        = formData.get("status")?.toString() || "pendente"
  const valueRaw      = formData.get("value")?.toString() || ""
  const value         = valueRaw.trim() === "" ? "0" : valueRaw
  const deadline      = formData.get("deadline")?.toString() || null
  if (!trackingCode || !recipient) throw new Error("Campos obrigatórios ausentes.")
  const created = await insertDelivery({
    userId: targetUserId, organizationId, panel, trackingCode, recipient, address, city, status, value, deadline: deadline || null,
  })
  await recordAudit({
    organizationId, actorUserId: admin.id, entityType: "delivery", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

export async function adminUpdateDeliveryStatus(organizationId: number, targetUserId: number, id: number, status: string) {
  const admin = await requireAdmin()
  const before = await findDeliveryById({ organizationId, userId: targetUserId, id })
  const after = await updateDeliveryStatusById({ organizationId, userId: targetUserId, id }, status)
  if (after) {
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "delivery", entityId: id,
      action: "update", before: before ?? null, after,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

export async function adminDeleteDelivery(organizationId: number, targetUserId: number, id: number) {
  const admin = await requireAdmin()
  const deleted = await deleteDeliveryById({ organizationId, userId: targetUserId, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "delivery", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

// ── Financeiro ───────────────────────────────────────────────────────────

export async function adminCreateTransaction(organizationId: number, targetUserId: number, formData: FormData) {
  const admin = await requireAdmin()
  const panel       = formData.get("panel")?.toString() || "jadlog"
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amountRaw    = formData.get("amount")?.toString() || ""
  const amount       = amountRaw.trim() === "" ? "0" : amountRaw
  const date         = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!description) throw new Error("Descrição obrigatória.")
  const created = await insertTransaction({ userId: targetUserId, organizationId, panel, type, description, category, amount, date })
  await recordAudit({
    organizationId, actorUserId: admin.id, entityType: "transaction", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

export async function adminUpdateTransaction(organizationId: number, targetUserId: number, formData: FormData) {
  const admin = await requireAdmin()
  const id          = parseInt(formData.get("id")?.toString() || "0")
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amount      = formData.get("amount")?.toString() || "0"
  const date        = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!id || !description) throw new Error("Dados inválidos.")

  const before = await findTransactionById({ organizationId, userId: targetUserId, id })
  const after = await updateTransactionById({ organizationId, userId: targetUserId, id }, { type, description, category, amount, date })
  if (after) {
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "transaction", entityId: id,
      action: "update", before: before ?? null, after,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

export async function adminDeleteTransaction(organizationId: number, targetUserId: number, id: number) {
  const admin = await requireAdmin()
  const deleted = await deleteTransactionById({ organizationId, userId: targetUserId, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: admin.id, entityType: "transaction", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath(`/gestor/entregadores/${targetUserId}`)
}

// ── Auditoria: exclusão de entrada (não "edição" de texto histórico —
// decisão de escopo: apagar é a operação com caso de uso legítimo claro;
// reescrever o conteúdo de uma entrada existente abriria espaço pra
// fabricar histórico, então não foi implementado). Grava um meta-registro
// documentando a própria exclusão, para nunca virar caixa-preta mesmo pro
// admin que fez a exclusão.
export async function adminDeleteAuditLogEntry(id: number) {
  const admin = await requireAdmin()
  const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1)
  if (!entry) return { error: "Registro não encontrado." }

  await db.delete(auditLogs).where(eq(auditLogs.id, id))
  await recordAudit({
    organizationId: entry.organizationId,
    actorUserId: admin.id,
    entityType: "audit_log_entry",
    entityId: id,
    action: "delete",
    before: entry,
    after: null,
  })
  revalidatePath("/gestor/auditoria")
  return { success: true }
}
