// Único ponto de acesso de leitura/escrita às tabelas operacionais
// (dailyRecords, deliveries, transactions). Toda função aqui exige
// organizationId no tipo — nenhuma query nessas tabelas deve ser montada
// à mão em app/actions/*.ts (garantido por teste de arquitetura, ver
// lib/db/scopes.test.ts), para nunca esquecer o filtro de tenant.
//
// insert/update/delete sempre usam .returning() — as actions usam a linha
// devolvida para montar o "antes"/"depois" da auditoria (lib/audit.ts) sem
// precisar de um SELECT extra.
import { db } from "@/lib/db"
import { dailyRecords, deliveries, transactions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

type Scope = { organizationId: number; userId: number }

// ── Daily records ────────────────────────────────────────────────────────

export function dailyRecordsForUser({ organizationId, userId, panel }: Scope & { panel: string }) {
  return db.select().from(dailyRecords)
    .where(and(
      eq(dailyRecords.organizationId, organizationId),
      eq(dailyRecords.userId, userId),
      eq(dailyRecords.panel, panel),
    ))
    .orderBy(desc(dailyRecords.date))
}

export function dailyRecordsForOrg({ organizationId }: { organizationId: number }) {
  return db.select().from(dailyRecords)
    .where(eq(dailyRecords.organizationId, organizationId))
    .orderBy(desc(dailyRecords.date))
}

// Sem filtro de panel — usado pelo drill-down do gestor, que espelha a
// operação inteira do entregador (todas as transportadoras), não uma só.
export function dailyRecordsForUserAllPanels({ organizationId, userId }: Scope) {
  return db.select().from(dailyRecords)
    .where(and(eq(dailyRecords.organizationId, organizationId), eq(dailyRecords.userId, userId)))
    .orderBy(desc(dailyRecords.date))
}

export async function findDailyRecord({ organizationId, userId, panel, date }: Scope & { panel: string; date: string }) {
  const [existing] = await db.select().from(dailyRecords)
    .where(and(
      eq(dailyRecords.organizationId, organizationId),
      eq(dailyRecords.userId, userId),
      eq(dailyRecords.panel, panel),
      eq(dailyRecords.date, date),
    ))
    .limit(1)
  return existing
}

export async function insertDailyRecord(values: typeof dailyRecords.$inferInsert) {
  const [row] = await db.insert(dailyRecords).values(values).returning()
  return row
}

export async function updateDailyRecordById(
  { organizationId, userId, id }: Scope & { id: number },
  values: Partial<typeof dailyRecords.$inferInsert>,
) {
  const [row] = await db.update(dailyRecords).set(values)
    .where(and(
      eq(dailyRecords.id, id),
      eq(dailyRecords.organizationId, organizationId),
      eq(dailyRecords.userId, userId),
    ))
    .returning()
  return row
}

export async function deleteDailyRecordById({ organizationId, userId, id }: Scope & { id: number }) {
  const [row] = await db.delete(dailyRecords)
    .where(and(
      eq(dailyRecords.id, id),
      eq(dailyRecords.organizationId, organizationId),
      eq(dailyRecords.userId, userId),
    ))
    .returning()
  return row
}

// ── Deliveries ───────────────────────────────────────────────────────────

export function deliveriesForUser({ organizationId, userId, panel }: Scope & { panel: string }) {
  return db.select().from(deliveries)
    .where(and(
      eq(deliveries.organizationId, organizationId),
      eq(deliveries.userId, userId),
      eq(deliveries.panel, panel),
    ))
    .orderBy(desc(deliveries.createdAt))
}

export function deliveriesForUserAllPanels({ organizationId, userId }: Scope) {
  return db.select().from(deliveries)
    .where(and(eq(deliveries.organizationId, organizationId), eq(deliveries.userId, userId)))
    .orderBy(desc(deliveries.createdAt))
}

export function deliveriesForOrg({ organizationId }: { organizationId: number }) {
  return db.select().from(deliveries)
    .where(eq(deliveries.organizationId, organizationId))
    .orderBy(desc(deliveries.createdAt))
}

export async function findDeliveryById({ organizationId, userId, id }: Scope & { id: number }) {
  const [existing] = await db.select().from(deliveries)
    .where(and(
      eq(deliveries.id, id),
      eq(deliveries.organizationId, organizationId),
      eq(deliveries.userId, userId),
    ))
    .limit(1)
  return existing
}

export async function insertDelivery(values: typeof deliveries.$inferInsert) {
  const [row] = await db.insert(deliveries).values(values).returning()
  return row
}

export async function updateDeliveryStatusById({ organizationId, userId, id }: Scope & { id: number }, status: string) {
  const [row] = await db.update(deliveries).set({ status })
    .where(and(
      eq(deliveries.id, id),
      eq(deliveries.organizationId, organizationId),
      eq(deliveries.userId, userId),
    ))
    .returning()
  return row
}

export async function deleteDeliveryById({ organizationId, userId, id }: Scope & { id: number }) {
  const [row] = await db.delete(deliveries)
    .where(and(
      eq(deliveries.id, id),
      eq(deliveries.organizationId, organizationId),
      eq(deliveries.userId, userId),
    ))
    .returning()
  return row
}

// ── Transactions ─────────────────────────────────────────────────────────

export function transactionsForUser({ organizationId, userId, panel }: Scope & { panel: string }) {
  return db.select().from(transactions)
    .where(and(
      eq(transactions.organizationId, organizationId),
      eq(transactions.userId, userId),
      eq(transactions.panel, panel),
    ))
    .orderBy(desc(transactions.date))
}

export function transactionsForUserAllPanels({ organizationId, userId }: Scope) {
  return db.select().from(transactions)
    .where(and(eq(transactions.organizationId, organizationId), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.date))
}

export function transactionsForOrg({ organizationId }: { organizationId: number }) {
  return db.select().from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .orderBy(desc(transactions.date))
}

export async function findTransactionById({ organizationId, userId, id }: Scope & { id: number }) {
  const [existing] = await db.select().from(transactions)
    .where(and(
      eq(transactions.id, id),
      eq(transactions.organizationId, organizationId),
      eq(transactions.userId, userId),
    ))
    .limit(1)
  return existing
}

export async function insertTransaction(values: typeof transactions.$inferInsert) {
  const [row] = await db.insert(transactions).values(values).returning()
  return row
}

export async function updateTransactionById(
  { organizationId, userId, id }: Scope & { id: number },
  values: Partial<typeof transactions.$inferInsert>,
) {
  const [row] = await db.update(transactions).set(values)
    .where(and(
      eq(transactions.id, id),
      eq(transactions.organizationId, organizationId),
      eq(transactions.userId, userId),
    ))
    .returning()
  return row
}

export async function deleteTransactionById({ organizationId, userId, id }: Scope & { id: number }) {
  const [row] = await db.delete(transactions)
    .where(and(
      eq(transactions.id, id),
      eq(transactions.organizationId, organizationId),
      eq(transactions.userId, userId),
    ))
    .returning()
  return row
}
