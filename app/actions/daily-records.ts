"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { dailyRecordsForUser, findDailyRecord, insertDailyRecord, updateDailyRecordById, deleteDailyRecordById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"
import { parseDailyRecordForm } from "@/lib/forms"

export async function getDailyRecords(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return dailyRecordsForUser({ organizationId, userId: user.id, panel })
}

export async function saveDailyRecord(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  // D3: validação no servidor (lib/forms.ts) — erro volta como { error }.
  const parsed = parseDailyRecordForm(formData)
  if (!parsed.ok) return { error: parsed.error }
  const { panel, date, valuePerDelivery, delivered, scheduled, occurrences, expenses } = parsed.value

  const existing = await findDailyRecord({ organizationId, userId: user.id, panel, date })

  if (existing) {
    const updated = await updateDailyRecordById(
      { organizationId, userId: user.id, id: existing.id },
      { valuePerDelivery, delivered, scheduled, occurrences, expenses, updatedAt: new Date() },
    )
    // updated pode vir undefined se o registro saiu do escopo entre o
    // findDailyRecord acima e este update (corrida rara) — mesma guarda que
    // os outros write paths (delete daqui, update/delete de deliveries e
    // transactions) já usam antes de auditar.
    if (updated) {
      await recordAudit({
        organizationId, actorUserId: user.id, entityType: "daily_record", entityId: existing.id,
        action: "update", before: existing, after: updated,
      })
    }
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
