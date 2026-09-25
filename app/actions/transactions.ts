"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { transactionsForUser, findTransactionById, insertTransaction, updateTransactionById, deleteTransactionById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"

export async function getTransactions(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return transactionsForUser({ organizationId, userId: user.id, panel })
}

export async function createTransaction(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  const panel       = formData.get("panel")?.toString() || "jadlog"
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amountRaw    = formData.get("amount")?.toString() || ""
  const amount       = amountRaw.trim() === "" ? "0" : amountRaw
  const date         = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!description) throw new Error("Descrição obrigatória.")
  const created = await insertTransaction({ userId: user.id, organizationId, panel, type, description, category, amount, date })
  await recordAudit({
    organizationId, actorUserId: user.id, entityType: "transaction", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function updateTransaction(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  const id          = parseInt(formData.get("id")?.toString() || "0")
  const type        = formData.get("type")?.toString() || "receita"
  const description = formData.get("description")?.toString().trim() || ""
  const category    = formData.get("category")?.toString().trim() || null
  const amount      = formData.get("amount")?.toString() || "0"
  const date        = formData.get("date")?.toString() || new Date().toISOString().slice(0, 10)
  if (!id || !description) throw new Error("Dados inválidos.")

  const before = await findTransactionById({ organizationId, userId: user.id, id })
  const after = await updateTransactionById({ organizationId, userId: user.id, id }, { type, description, category, amount, date })
  if (after) {
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "transaction", entityId: id,
      action: "update", before: before ?? null, after,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}

export async function deleteTransaction(id: number) {
  const { organizationId, user } = await requireEntregador()
  const deleted = await deleteTransactionById({ organizationId, userId: user.id, id })
  if (deleted) {
    await recordAudit({
      organizationId, actorUserId: user.id, entityType: "transaction", entityId: id,
      action: "delete", before: deleted, after: null,
    })
  }
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
}
