"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { deliveriesForUser, findDeliveryById, insertDelivery, updateDeliveryStatusById, deleteDeliveryById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"

export async function getDeliveries(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return deliveriesForUser({ organizationId, userId: user.id, panel })
}

export async function createDelivery(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
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
    userId: user.id, organizationId, panel, trackingCode, recipient, address, city, status, value, deadline: deadline || null,
  })
  await recordAudit({
    organizationId, actorUserId: user.id, entityType: "delivery", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function updateDeliveryStatus(id: number, status: string) {
  const { organizationId, user } = await requireEntregador()
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
