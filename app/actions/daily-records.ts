"use server"

import { db } from "@/lib/db"
import { dailyRecords } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/app/actions/auth"

export async function getDailyRecords() {
  const user = await requireUser()
  return db.select().from(dailyRecords).where(eq(dailyRecords.userId, user.id)).orderBy(desc(dailyRecords.date))
}

export async function saveDailyRecord(formData: FormData) {
  const user             = await requireUser()
  const date             = formData.get("date")?.toString() ?? ""
  const valuePerDelivery = formData.get("valuePerDelivery")?.toString() ?? "3.50"
  const delivered        = parseInt(formData.get("delivered")?.toString() ?? "0") || 0
  const scheduled        = parseInt(formData.get("scheduled")?.toString() ?? "0") || 0
  const occurrences      = parseInt(formData.get("occurrences")?.toString() ?? "0") || 0
  const expenses         = formData.get("expenses")?.toString() ?? "0"

  if (!date) return { error: "Selecione uma data." }

  const [existing] = await db
    .select({ id: dailyRecords.id })
    .from(dailyRecords)
    .where(and(eq(dailyRecords.userId, user.id), eq(dailyRecords.date, date)))
    .limit(1)

  if (existing) {
    await db.update(dailyRecords)
      .set({ valuePerDelivery, delivered, scheduled, occurrences, expenses, updatedAt: new Date() })
      .where(eq(dailyRecords.id, existing.id))
  } else {
    await db.insert(dailyRecords).values({
      userId: user.id, date, valuePerDelivery, delivered, scheduled, occurrences, expenses,
    })
  }
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteDailyRecord(id: number) {
  const user = await requireUser()
  await db.delete(dailyRecords).where(and(eq(dailyRecords.id, id), eq(dailyRecords.userId, user.id)))
  revalidatePath("/dashboard")
}
