"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { dailyRecordsForUser, findDailyRecord, insertDailyRecord, updateDailyRecordById, deleteDailyRecordById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"

export async function getDailyRecords(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return dailyRecordsForUser({ organizationId, userId: user.id, panel })
}

export async function saveDailyRecord(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  const panel            = formData.get("panel")?.toString() || "jadlog"
  const date              = formData.get("date")?.toString() || ""
  const valuePerDelivery  = formData.get("valuePerDelivery")?.toString() || "3.50"
  const delivered         = parseInt(formData.get("delivered")?.toString() || "0") || 0
  const scheduled         = parseInt(formData.get("scheduled")?.toString() || "0") || 0
  const occurrences       = parseInt(formData.get("occurrences")?.toString() || "0") || 0
  // FIX: string vazia vira "0" para o banco não rejeitar o campo numeric
  const expensesRaw       = formData.get("expenses")?.toString() || ""
  const expenses          = expensesRaw.trim() === "" ? "0" : expensesRaw

  if (!date) return { error: "Selecione uma data." }

  const existing = await findDailyRecord({ organizationId, userId: user.id, panel, date })

  if (existing) {
    const updated = await updateDailyRecordById(
      { organizationId, userId: user.id, id: existing.id },
      { valuePerDelivery, delivered, scheduled, occurrences, expenses, updatedAt: new Date() },
    )
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "daily_record", entityId: existing.id,
      action: "update", before: existing, after: updated,
    })
  } else {
    const created = await insertDailyRecord({
      userId: user.id, organizationId, panel, date, valuePerDelivery, delivered, scheduled, occurrences, expenses,
    })
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "daily_record", entityId: created.id,
      action: "create", before: null, after: created,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
  return { success: true }
}

export async function deleteDailyRecord(id: number) {
  const { organizationId, user } = await requireEntregador()
  const deleted = await deleteDailyRecordById({ organizationId, userId: user.id, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "daily_record", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}
