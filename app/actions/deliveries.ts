"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { deliveriesForUser, findDeliveryById, insertDelivery, updateDeliveryStatusById, deleteDeliveryById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"
import { isDeliveryStatus, parseDeliveryForm } from "@/lib/forms"

export async function getDeliveries(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return deliveriesForUser({ organizationId, userId: user.id, panel })
}

export async function createDelivery(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  // D3/D12: valida no servidor e devolve { error } em vez de lançar.
  const parsed = parseDeliveryForm(formData)
  if (!parsed.ok) return { error: parsed.error }
  const created = await insertDelivery({ userId: user.id, organizationId, ...parsed.value })
  await recordAudit({
    organizationId, actorUserId: user.id, entityType: "delivery", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
  return { success: true }
}

export async function updateDeliveryStatus(id: number, status: string) {
  const { organizationId, user } = await requireEntregador()
  if (!isDeliveryStatus(status)) return // a UI só oferece a lista; outro valor é chamada forjada
  const before = await findDeliveryById({ organizationId, userId: user.id, id })
  const after = await updateDeliveryStatusById({ organizationId, userId: user.id, id }, status)
  if (after) {
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "delivery", entityId: id,
      action: "update", before: before ?? null, after,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function deleteDelivery(id: number) {
  const { organizationId, user } = await requireEntregador()
  const deleted = await deleteDeliveryById({ organizationId, userId: user.id, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "delivery", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}
