"use server"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { memberships, users, auditLogs } from "@/lib/db/schema"
import { requireGestor, type MembershipContext } from "@/app/actions/auth"
import {
  dailyRecordsForOrg, deliveriesForOrg, transactionsForOrg,
  dailyRecordsForUserAllPanels, deliveriesForUserAllPanels, transactionsForUserAllPanels,
} from "@/lib/db/scopes"
import { panelLabel, PANEL_LABELS } from "@/lib/format"

// `known` deixa o chamador reaproveitar um requireGestor() já resolvido no
// mesmo request (ex.: a página resolve uma vez e repassa pras funções que
// ela mesma chama em paralelo) — omitido, resolve sozinho como antes.
export async function getOrgOverview(known?: MembershipContext) {
  const { organizationId } = known ?? await requireGestor()

  const [dailyRecords, deliveries, transactions, members] = await Promise.all([
    dailyRecordsForOrg({ organizationId }),
    deliveriesForOrg({ organizationId }),
    transactionsForOrg({ organizationId }),
    db.select({ userId: memberships.userId, name: users.name, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.role, "entregador"),
        eq(memberships.status, "active"),
      ))
      .orderBy(users.name),
  ])

  return { dailyRecords, deliveries, transactions, members }
}

// Anti-IDOR: só retorna dados se targetUserId tiver membership de entregador
// ATIVA na MESMA organização do gestor logado — nunca confia no id da URL sozinho.
export async function getMemberDashboardData(targetUserId: number, known?: MembershipContext) {
  const { organizationId } = known ?? await requireGestor()

  const [member] = await db.select({ name: users.name, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(
      eq(memberships.userId, targetUserId),
      eq(memberships.organizationId, organizationId),
      eq(memberships.role, "entregador"),
      eq(memberships.status, "active"),
    ))
    .limit(1)

  if (!member) return null

  const [dailyRecords, deliveries, transactions] = await Promise.all([
    dailyRecordsForUserAllPanels({ organizationId, userId: targetUserId }),
    deliveriesForUserAllPanels({ organizationId, userId: targetUserId }),
    transactionsForUserAllPanels({ organizationId, userId: targetUserId }),
  ])

  // Não mescla os painéis num total único — o gestor precisa ver onde
  // (em qual painel/contrato) o entregador de fato performou, igual ao
  // próprio entregador vê em /dashboard vs /panel2. Sempre mostra os
  // painéis padrão mesmo sem nenhum dado ainda, para o gestor saber que
  // eles existem.
  const panelKeys = Array.from(new Set([
    ...Object.keys(PANEL_LABELS),
    ...dailyRecords.map((r) => r.panel),
    ...deliveries.map((d) => d.panel),
    ...transactions.map((t) => t.panel),
  ]))

  const panels = panelKeys.map((panel) => ({
    panel,
    label: panelLabel(panel),
    dailyRecords: dailyRecords.filter((r) => r.panel === panel),
    deliveries: deliveries.filter((d) => d.panel === panel),
    transactions: transactions.filter((t) => t.panel === panel),
  }))

  return { member, panels }
}

// Somente leitura — audit_logs nunca ganha update/delete nesta app (ver
// lib/audit.ts). Limitado às 200 entradas mais recentes da organização.
export async function getAuditLog(known?: MembershipContext) {
  const { organizationId } = known ?? await requireGestor()
  return db.select({
    id: auditLogs.id,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    action: auditLogs.action,
    fieldChanges: auditLogs.fieldChanges,
    createdAt: auditLogs.createdAt,
    actorName: users.name,
  })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(eq(auditLogs.organizationId, organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200)
}
