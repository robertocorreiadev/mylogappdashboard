"use server"

import { db } from "@/lib/db"
import { transactions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/app/actions/auth"

export async function getTransactions() {
  const user = await requireUser()
  return db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.date))
}

export async function createTransaction(formData: FormData) {
  const user        = await requireUser()
  const type        = formData.get("type")?.toString() ?? "receita"
  const description = formData.get("description")?.toString().trim() ?? ""
  const category    = formData.get("category")?.toString().trim() || null
  const amount      = formData.get("amount")?.toString() ?? "0"
  const date        = formData.get("date")?.toString() ?? new Date().toISOString().slice(0, 10)

  if (!description) return { error: "Descrição é obrigatória." }

  await db.insert(transactions).values({ userId: user.id, type, description, category, amount, date })
  revalidatePath("/dashboard")
}

export async function deleteTransaction(id: number) {
  const user = await requireUser()
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
  revalidatePath("/dashboard")
}
