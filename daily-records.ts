"use server"

import { db } from "@/lib/db"
import { dailyRecords } from "@/lib/db/schema"
import { and, eq, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/app/actions/auth"

// ── Listar todos os registros do usuário ─────────────────────
export async function getDailyRecords() {
  const user = await requireUser()
  return db
    .select()
    .from(dailyRecords)
    .where(eq(dailyRecords.userId, user.id))
    .orderBy(desc(dailyRecords.date))
}

// ── Salvar/atualizar boleta do dia (upsert) ──────────────────
export async function saveDailyRecord(formData: FormData) {
  const user = await requireUser()

  const date            = formData.get("date")?.toString() ?? ""
  const valuePerDelivery = formData.get("valuePerDelivery")?.toString() ?? "3.50"
  const delivered       = parseInt(formData.get("delivered")?.toString() ?? "0")
  const scheduled       = parseInt(formData.get("scheduled")?.toString() ?? "0")
  const occurrences     = parseInt(formData.get("occurrences")?.toString() ?? "0")
  const expenses        = formData.get("expenses")?.toString() ?? "0"

  if (!date) return { error: "Selecione uma data." }

  // Verifica se já existe registro para esse dia
  const [existing] = await db
    .select()
    .from(dailyRecords)
    .where(and(eq(dailyRecords.userId, user.id), eq(dailyRecords.date, date)))
    .limit(1)

  if (existing) {
    await db
      .update(dailyRecords)
      .set({ valuePerDelivery, delivered, scheduled, occurrences, expenses, updatedAt: new Date() })
      .where(eq(dailyRecords.id, existing.id))
  } else {
    await db.insert(dailyRecords).values({
      userId: user.id,
      date,
      valuePerDelivery,
      delivered,
      scheduled,
      occurrences,
      expenses,
    })
  }

  revalidatePath("/dashboard")
  return { success: true }
}

// ── Excluir registro ─────────────────────────────────────────
export async function deleteDailyRecord(id: number) {
  const user = await requireUser()
  await db
    .delete(dailyRecords)
    .where(and(eq(dailyRecords.id, id), eq(dailyRecords.userId, user.id)))
  revalidatePath("/dashboard")
}

// ── Resumo mensal ────────────────────────────────────────────
export async function getMonthlySummary(year: number, month: number) {
  const user = await requireUser()
  const prefix = `${year}-${String(month).padStart(2, "0")}`

  const records = await db
    .select()
    .from(dailyRecords)
    .where(and(eq(dailyRecords.userId, user.id), sql`${dailyRecords.date}::text LIKE ${prefix + "%"}`))

  const totalDelivered  = records.reduce((s, r) => s + r.delivered, 0)
  const totalGross      = records.reduce((s, r) => s + r.delivered * Number(r.valuePerDelivery), 0)
  const totalExpenses   = records.reduce((s, r) => s + Number(r.expenses), 0)
  const totalNet        = totalGross - totalExpenses
  const workingDays     = records.length
  const avgNet          = workingDays ? totalNet / workingDays : 0

  return { totalDelivered, totalGross, totalExpenses, totalNet, workingDays, avgNet, records }
}
