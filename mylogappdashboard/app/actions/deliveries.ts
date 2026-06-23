"use server"

import { db } from "@/lib/db"
import { deliveries } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getProfile } from "@/lib/session"

async function requireProfile() {
  const profile = await getProfile()
  if (!profile) throw new Error("Não autenticado")
  return profile
}

export async function getDeliveries() {
  const profile = await requireProfile()
  return db.select().from(deliveries).where(eq(deliveries.profile, profile)).orderBy(desc(deliveries.createdAt))
}

export async function createDelivery(formData: FormData) {
  const profile = await requireProfile()
  const trackingCode = formData.get("trackingCode")?.toString().trim() || ""
  const recipient = formData.get("recipient")?.toString().trim() || ""
  const address = formData.get("address")?.toString().trim() || null
  const city = formData.get("city")?.toString().trim() || null
  const status = formData.get("status")?.toString() || "pendente"
  const value = formData.get("value")?.toString() || "0"
  const deadline = formData.get("deadline")?.toString() || null

  if (!trackingCode || !recipient) {
    throw new Error("Código de rastreio e destinatário são obrigatórios")
  }

  await db.insert(deliveries).values({
    profile,
    trackingCode,
    recipient,
    address,
    city,
    status,
    value,
    deadline: deadline || null,
  })
  revalidatePath("/dashboard")
}

export async function updateDeliveryStatus(id: number, status: string) {
  const profile = await requireProfile()
  await db
    .update(deliveries)
    .set({ status })
    .where(and(eq(deliveries.id, id), eq(deliveries.profile, profile)))
  revalidatePath("/dashboard")
}

export async function deleteDelivery(id: number) {
  const profile = await requireProfile()
  await db.delete(deliveries).where(and(eq(deliveries.id, id), eq(deliveries.profile, profile)))
  revalidatePath("/dashboard")
}
