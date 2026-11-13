// Base de teste de PIOR CASO (TODO "Base de teste de pior caso"; observation
// 0029 do task-observer). Usada pelos testes (lib/worst-case.test.ts) e pelo
// seed (scripts/seed-worst-case.ts). Dados fictícios: nenhum dado real.
//
// Cenários:
// - mai/2026: 3 entregadores × 2 painéis × dias 01–20, mesma data em tudo;
//   300 entregas × R$ 20,00 − R$ 100,00 → R$ 354.000,00 de líquido por painel;
// - abr/2026: mês negativo (despesa maior que o bruto);
// - mar/2026: só a 1ª quinzena;
// - fev/2026: só o dia 16;
// - 31/12/2025 e 01/01/2026: virada de ano.
import type { DailyRecord, Transaction } from "@/lib/db/schema"

export const WORST_CASE_ORG_ID = 900
export const WORST_CASE_MEMBERS = [
  { userId: 901, name: "Ana Pior Caso", email: "ana.piorcaso@exemplo.test" },
  { userId: 902, name: "Bruno Pior Caso", email: "bruno.piorcaso@exemplo.test" },
  { userId: 903, name: "Carla Pior Caso", email: "carla.piorcaso@exemplo.test" },
] as const

const STAMP = new Date("2026-06-01T12:00:00Z")

type RecInput = { userId: number; panel: string; date: string; delivered: number; vpd: string; expenses: string }

function rec(id: number, r: RecInput): DailyRecord {
  return {
    id,
    userId: r.userId,
    organizationId: WORST_CASE_ORG_ID,
    panel: r.panel,
    date: r.date,
    valuePerDelivery: r.vpd,
    delivered: r.delivered,
    scheduled: 0,
    occurrences: 0,
    expenses: r.expenses,
    updatedAt: STAMP,
    createdAt: STAMP,
  }
}

export function worstCaseDailyRecords(): DailyRecord[] {
  const out: RecInput[] = []
  const [ana, bruno] = WORST_CASE_MEMBERS
  for (let day = 1; day <= 20; day++) {
    const date = `2026-05-${String(day).padStart(2, "0")}`
    for (const m of WORST_CASE_MEMBERS) {
      for (const panel of ["jadlog", "panel2"]) {
        out.push({ userId: m.userId, panel, date, delivered: 300, vpd: "20.00", expenses: "100.00" })
      }
    }
  }
  out.push({ userId: ana.userId, panel: "jadlog", date: "2026-04-02", delivered: 1, vpd: "2.00", expenses: "500.00" })
  out.push({ userId: ana.userId, panel: "jadlog", date: "2026-04-03", delivered: 1, vpd: "2.00", expenses: "500.00" })
  out.push({ userId: ana.userId, panel: "jadlog", date: "2026-03-05", delivered: 50, vpd: "2.00", expenses: "0.00" })
  out.push({ userId: ana.userId, panel: "jadlog", date: "2026-03-10", delivered: 50, vpd: "2.00", expenses: "0.00" })
  out.push({ userId: ana.userId, panel: "jadlog", date: "2026-02-16", delivered: 10, vpd: "3.00", expenses: "0.00" })
  out.push({ userId: bruno.userId, panel: "jadlog", date: "2025-12-31", delivered: 40, vpd: "2.00", expenses: "0.00" })
  out.push({ userId: bruno.userId, panel: "jadlog", date: "2026-01-01", delivered: 40, vpd: "2.00", expenses: "0.00" })
  return out.map((r, i) => rec(i + 1, r))
}

export function worstCaseTransactions(): Transaction[] {
  const [ana] = WORST_CASE_MEMBERS
  const base = { userId: ana.userId, organizationId: WORST_CASE_ORG_ID, panel: "jadlog", category: "Teste", createdAt: STAMP }
  return [
    { ...base, id: 1, type: "receita", description: "Receita grande (pior caso)", amount: "500000.00", date: "2026-05-15" },
    { ...base, id: 2, type: "despesa", description: "Despesa com centavos", amount: "1200.50", date: "2026-05-16" },
    { ...base, id: 3, type: "despesa", description: "Mês só com despesa", amount: "999.99", date: "2026-04-10" },
  ]
}
