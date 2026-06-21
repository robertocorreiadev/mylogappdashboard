"use server"

import { db } from "@/lib/db"
import { transactions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getProfile } from "@/lib/session"

async function requireProfile() {
  const profile = await getProfile()
  if (!profile) throw new Error("Não autenticado")
  return profile
}

export async function getTransactions() {
  const profile = await requireProfile()
  return db.select().from(transactions).where(eq(transactions.profile, profile)).orderBy(desc(transactions.date))
}

export async function createTransaction(formData: FormData) {
  const profile = await requireProfile()
  const type = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category = formData.get("category")?.toString().trim() || null
  const amount = formData.get("amount")?.toString() || "0"
  const date = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)

  if (!description) {
    throw new Error("Descrição é obrigatória")
  }

  await db.insert(transactions).values({
    profile,
    type,
    description,
    category,
    amount,
    date,
  })
  revalidatePath("/dashboard")
}

export async function deleteTransaction(id: number) {
  const profile = await requireProfile()
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.profile, profile)))
  revalidatePath("/dashboard")
}
