"use server"

import { db } from "@/lib/db"
import { deliveries } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/app/actions/auth"

export async function getDeliveries(panel: string = "jadlog") {
  const user = await requireUser()
  return db.select().from(deliveries)
    .where(and(eq(deliveries.userId, user.id), eq(deliveries.panel, panel)))
    .orderBy(desc(deliveries.createdAt))
}

export async function createDelivery(formData: FormData) {
  const user         = await requireUser()
  const panel        = formData.get("panel")?.toString() || "jadlog"
  const trackingCode = formData.get("trackingCode")?.toString().trim() || ""
  const recipient    = formData.get("recipient")?.toString().trim() || ""
  const address      = formData.get("address")?.toString().trim() || null
  const city         = formData.get("city")?.toString().trim() || null
  const status       = formData.get("status")?.toString() || "pendente"
  const valueRaw     = formData.get("value")?.toString() || ""
  const value        = valueRaw.trim() === "" ? "0" : valueRaw
  const deadline     = formData.get("deadline")?.toString() || null
  if (!trackingCode || !recipient) throw new Error("Campos obrigatórios ausentes.")
  await db.insert(deliveries).values({ userId: user.id, panel, trackingCode, recipient, address, city, status, value, deadline: deadline || null })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function updateDeliveryStatus(id: number, status: string) {
  const user = await requireUser()
  await db.update(deliveries).set({ status }).where(and(eq(deliveries.id, id), eq(deliveries.userId, user.id)))
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function deleteDelivery(id: number) {
  const user = await requireUser()
  await db.delete(deliveries).where(and(eq(deliveries.id, id), eq(deliveries.userId, user.id)))
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}
