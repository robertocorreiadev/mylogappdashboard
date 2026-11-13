// Exclusão de usuário em cascata (D8, spec §15), numa transação só.
//
// O que sai: as boletas, entregas e lançamentos dele; as memberships; os
// convites que ele criou; a auditoria em que ele é o autor (no sistema, um
// usuário só audita ações sobre os PRÓPRIOS registros — o gestor só lê e o
// admin audita como admin —, então nenhum rastro de outra pessoa se perde);
// e a organização individual dele (planUserDeletion). Referências de "quem
// convidou" / "quem aceitou" viram NULL. Fica um meta-registro do admin
// ("excluiu usuário") em cada organização onde ele era membro.
import { eq, inArray, ne, and, count } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  users, organizations, memberships, invites, auditLogs, dailyRecords, deliveries, transactions,
} from "@/lib/db/schema"
import { planUserDeletion } from "@/lib/user-deletion"

// `exec` = o banco (padrão) ou uma transação externa. O dry-run usa uma
// transação externa com ROLLBACK; aqui dentro vira um SAVEPOINT.
type Executor = Pick<typeof db, "select" | "transaction">

export async function deleteUserCascade(
  userId: number, adminId: number, exec: Executor = db,
): Promise<{ error?: string; success?: boolean }> {
  const [target] = await exec.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(eq(users.id, userId)).limit(1)
  if (!target) return { error: "Usuário não encontrado." }

  // A checagem de dono roda DENTRO da transação: um membro que entre na
  // organização entre a checagem e a exclusão não pode perder os dados. O
  // FOR UPDATE trava a linha da organização: o insert de membership (FK) espera.
  const result = await exec.transaction(async (tx) => {
    const owned = await tx.select({ id: organizations.id, name: organizations.name })
      .from(organizations).where(eq(organizations.ownerUserId, userId)).for("update")
    const ownedOrgs = []
    for (const o of owned) {
      const [{ n }] = await tx.select({ n: count() }).from(memberships)
        .where(and(eq(memberships.organizationId, o.id), ne(memberships.userId, userId)))
      ownedOrgs.push({ ...o, otherMembers: n })
    }
    const plan = planUserDeletion({ ownedOrgs })
    if (!plan.ok) return { error: plan.error }

    const memberOrgIds = (await tx.selectDistinct({ id: memberships.organizationId })
      .from(memberships).where(eq(memberships.userId, userId))).map((r) => r.id)
    // Em sequência: uma transação usa um cliente só, e queries simultâneas
    // nele são deprecated no pg 9 (aviso visto no dry-run de 2026-11-13).
    const [b] = await tx.select({ n: count() }).from(dailyRecords).where(eq(dailyRecords.userId, userId))
    const [d] = await tx.select({ n: count() }).from(deliveries).where(eq(deliveries.userId, userId))
    const [t] = await tx.select({ n: count() }).from(transactions).where(eq(transactions.userId, userId))

    // Organização individual: os registros operacionais não têm cascade por
    // organization_id, então saem antes; memberships, convites e auditoria
    // dela saem pelo ON DELETE CASCADE da organização.
    if (plan.soloOrgIds.length) {
      await tx.delete(dailyRecords).where(inArray(dailyRecords.organizationId, plan.soloOrgIds))
      await tx.delete(deliveries).where(inArray(deliveries.organizationId, plan.soloOrgIds))
      await tx.delete(transactions).where(inArray(transactions.organizationId, plan.soloOrgIds))
      await tx.delete(organizations).where(inArray(organizations.id, plan.soloOrgIds))
    }

    await tx.update(memberships).set({ invitedByUserId: null }).where(eq(memberships.invitedByUserId, userId))
    await tx.update(invites).set({ acceptedByUserId: null }).where(eq(invites.acceptedByUserId, userId))
    await tx.delete(invites).where(eq(invites.createdByUserId, userId))
    await tx.delete(auditLogs).where(eq(auditLogs.actorUserId, userId))
    // ON DELETE CASCADE por user_id: memberships, boletas, entregas, lançamentos.
    await tx.delete(users).where(eq(users.id, userId))

    const snapshot = {
      id: target.id, name: target.name, email: target.email,
      removidos: { boletas: b.n, entregas: d.n, lancamentos: t.n, organizacoesIndividuais: plan.soloOrgIds.length },
    }
    const survivingOrgs = memberOrgIds.filter((id) => !plan.soloOrgIds.includes(id))
    for (const organizationId of survivingOrgs) {
      await tx.insert(auditLogs).values({
        organizationId, actorUserId: adminId, entityType: "user", entityId: userId, action: "delete",
        fieldChanges: null, snapshotBefore: snapshot, snapshotAfter: null,
      })
    }
    return { success: true }
  })
  return result
}
