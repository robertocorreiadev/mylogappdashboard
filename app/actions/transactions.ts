"use server"

import { db } from "@/lib/db"
import { transactions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/app/actions/auth"

export async function getTransactions(panel: string = "jadlog") {
  const user = await requireUser()
  return db.select().from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.panel, panel)))
    .orderBy(desc(transactions.date))
}

export async function createTransaction(formData: FormData) {
  const user        = await requireUser()
  const panel       = formData.get("panel")?.toString() || "jadlog"
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amount      = formData.get("amount")?.toString() || "0"
  const date        = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!description) throw new Error("Descrição obrigatória.")
  await db.insert(transactions).values({ userId: user.id, panel, type, description, category, amount, date })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function updateTransaction(formData: FormData) {
  const user        = await requireUser()
  const id          = parseInt(formData.get("id")?.toString() || "0")
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amount      = formData.get("amount")?.toString() || "0"
  const date        = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!id || !description) throw new Error("Dados inválidos.")
  await db.update(transactions).set({ type, description, category, amount, date })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function deleteTransaction(id: number) {
  const user = await requireUser()
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}
