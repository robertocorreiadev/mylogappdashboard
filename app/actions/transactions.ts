"use server"

import { revalidatePath } from "next/cache"
import { requireEntregador } from "@/app/actions/auth"
import { transactionsForUser, findTransactionById, insertTransaction, updateTransactionById, deleteTransactionById } from "@/lib/db/scopes"
import { recordAudit } from "@/lib/audit"
import { parseRecordId, parseTransactionForm } from "@/lib/forms"
import { todayISOIn } from "@/lib/dates"

export async function getTransactions(panel: string = "jadlog") {
  const { organizationId, user } = await requireEntregador()
  return transactionsForUser({ organizationId, userId: user.id, panel })
}

export async function createTransaction(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  // D2/D3/D12: valida no servidor; "hoje" no fuso de São Paulo; erro → { error }.
  const parsed = parseTransactionForm(formData, todayISOIn())
  if (!parsed.ok) return { error: parsed.error }
  const created = await insertTransaction({ userId: user.id, organizationId, ...parsed.value })
  await recordAudit({
    organizationId, actorUserId: user.id, entityType: "transaction", entityId: created.id,
    action: "create", before: null, after: created,
  })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
  return { success: true }
}

export async function updateTransaction(formData: FormData) {
  const { organizationId, user } = await requireEntregador()
  const parsedId = parseRecordId(formData.get("id")?.toString() ?? "")
  if (!parsedId.ok) return { error: parsedId.error }
  const parsed = parseTransactionForm(formData, todayISOIn())
  if (!parsed.ok) return { error: parsed.error }
  const id = parsedId.value
  const { type, description, category, amount, date } = parsed.value

  const before = await findTransactionById({ organizationId, userId: user.id, id })
  const after = await updateTransactionById({ organizationId, userId: user.id, id }, { type, description, category, amount, date })
  // Escopo não achou a linha (excluída em outra aba, ou id de outro usuário).
  if (!after) return { error: "Lançamento não encontrado." }
  await recordAudit({
    organizationId, actorUserId: user.id, entityType: "transaction", entityId: id,
    action: "update", before: before ?? null, after,
  })
  revalidatePath("/dashboard")
  revalidatePath("/panel2")
  return { success: true }
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
