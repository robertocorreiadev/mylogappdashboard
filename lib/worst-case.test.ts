import { describe, it, expect } from "vitest"
import { worstCaseDailyRecords, worstCaseTransactions, WORST_CASE_MEMBERS } from "./fixtures/worst-case"
import { computeKpis } from "./kpis"
import { netByQuinzena } from "./metrics"
import { memberStats, panelSummaries, lastBoletaByUser } from "./gestor-stats"
import { filterByPeriod, formatCurrency, formatCurrencyCompact } from "./format"
import { periodOptions } from "./period"
import { seedTargetAllowed } from "./seed-guard"

// Base de pior caso (observation 0029 / TODO "Base de teste de pior caso"):
// vários entregadores e os dois painéis na mesma data, valores grandes, mês
// negativo, só a 1ª quinzena, só o dia 16 e virada de ano. Os defeitos que a
// revisão achou e o smoke test com dados comuns não pegou caem aqui.

const NBSP = " "
const all = worstCaseDailyRecords()
const may = filterByPeriod(all, 2026, 4)
const mayJadlog = may.filter((r) => r.panel === "jadlog")

describe("mês grande: 3 entregadores × 2 painéis × 20 dias", () => {
  it("dias trabalhados = datas distintas (20), não boletas (60)", () => {
    const k = computeKpis(mayJadlog, [])
    expect(mayJadlog).toHaveLength(60)
    expect(k.workDays).toBe(20)
    expect(k.avgNet).toBe(354_000 / 20)
  })

  it("valores de R$ 100 mil+ formatam inteiros e o eixo compacto não repete", () => {
    const k = computeKpis(mayJadlog, [])
    expect(k.totalNet).toBe(354_000)
    expect(formatCurrency(k.totalNet)).toBe(`R$${NBSP}354.000,00`)
    expect(formatCurrencyCompact(354_000)).toMatch(/mil/)
    expect(formatCurrencyCompact(354_000)).not.toBe(formatCurrencyCompact(300_000))
  })

  it("cada painel tem os próprios números; nenhum é a soma dos dois", () => {
    const s = panelSummaries(may)
    const j = s.find((p) => p.panel === "jadlog")!
    const p2 = s.find((p) => p.panel === "panel2")!
    expect(j.net).toBe(354_000)
    expect(p2.net).toBe(354_000)
    expect(j.delivered).toBe(18_000)
    expect(j.net).not.toBe(computeKpis(may, []).totalNet)
  })

  it("cartão do entregador: por painel, nunca somado", () => {
    const m = memberStats(may).get(WORST_CASE_MEMBERS[0].userId)!
    expect(m.byPanel.jadlog).toEqual({ delivered: 6_000, net: 118_000 })
    expect(m.byPanel.panel2).toEqual({ delivered: 6_000, net: 118_000 })
  })

  it("quinzenas: datas distintas e soma = líquido do mês", () => {
    const q = netByQuinzena(mayJadlog)!
    expect(q.first).toEqual({ net: 265_500, days: 15 })
    expect(q.second).toEqual({ net: 88_500, days: 5, lastDay: 20 })
    expect(q.first.net + q.second.net).toBe(354_000)
  })

  it("saldo financeiro com receita grande e despesa com centavos", () => {
    const k = computeKpis([], filterByPeriod(worstCaseTransactions(), 2026, 4))
    expect(k.receita).toBe(500_000)
    expect(k.despesa).toBe(1_200.5)
    expect(k.saldo).toBe(498_799.5)
  })
})

describe("meses de borda", () => {
  it("mês negativo: líquido e média negativos", () => {
    const k = computeKpis(filterByPeriod(all, 2026, 3), [])
    expect(k.totalNet).toBe(-996)
    expect(k.avgNet).toBe(-498)
  })

  it("só a 1ª quinzena: a 2ª fica vazia (sem último dia)", () => {
    const q = netByQuinzena(filterByPeriod(all, 2026, 2))!
    expect(q.first).toEqual({ net: 200, days: 2 })
    expect(q.second).toEqual({ net: 0, days: 0, lastDay: null })
  })

  it("só a 2ª quinzena, vários dias: datas distintas e último dia 31", () => {
    const q = netByQuinzena(filterByPeriod(all, 2026, 6))!
    expect(q.first).toEqual({ net: 0, days: 0 })
    expect(q.second).toEqual({ net: 300, days: 3, lastDay: 31 })
  })

  it("só o dia 16: 1ª vazia, 2ª com último dia 16", () => {
    const q = netByQuinzena(filterByPeriod(all, 2026, 1))!
    expect(q.first).toEqual({ net: 0, days: 0 })
    expect(q.second).toEqual({ net: 30, days: 1, lastDay: 16 })
  })

  it("virada de ano: o mês de referência é janeiro do ano novo", () => {
    // Pelo filtro da tela: dez/2025 e jan/2026 separados certo na virada.
    expect(filterByPeriod(all, 2025, 11).map((r) => r.date)).toEqual(["2025-12-31"])
    expect(filterByPeriod(all, 2026, 0).map((r) => r.date)).toEqual(["2026-01-01"])
    const turn = [...filterByPeriod(all, 2025, 11), ...filterByPeriod(all, 2026, 0)]
    const q = netByQuinzena(turn)!
    expect([q.year, q.month]).toEqual([2026, 0])
    expect(q.first.net).toBe(80)
    expect(periodOptions(all, null).years).toEqual([2026, 2025])
  })

  it("última boleta de cada entregador", () => {
    const last = lastBoletaByUser(all)
    expect(last.get(WORST_CASE_MEMBERS[0].userId)).toBe("2026-05-20")
    expect(last.get(WORST_CASE_MEMBERS[1].userId)).toBe("2026-05-20")
  })
})

describe("seedTargetAllowed (o seed nunca roda no banco do .env)", () => {
  const prod = "postgres://u:p@ep-abc-123-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
  it("sem destino → recusa", () => {
    expect(seedTargetAllowed(undefined, prod)).toBe(false)
    expect(seedTargetAllowed("", prod)).toBe(false)
  })
  it("sem DATABASE_URL para comparar → recusa (não libera por falta de referência)", () => {
    expect(seedTargetAllowed("postgres://u:p@localhost:5432/mylog_dev", undefined)).toBe(false)
    expect(seedTargetAllowed("postgres://u:p@localhost:5432/mylog_dev", "")).toBe(false)
  })
  it("mesmo endpoint Neon → recusa, com ou sem -pooler, outra senha, parâmetro ou banco", () => {
    expect(seedTargetAllowed(prod, prod)).toBe(false)
    expect(seedTargetAllowed("postgres://x:y@ep-abc-123.c-4.us-east-1.aws.neon.tech/neondb", prod)).toBe(false)
    expect(seedTargetAllowed("postgres://x:y@EP-ABC-123-POOLER.c-4.us-east-1.aws.neon.tech/outro", prod)).toBe(false)
  })
  it("URL inválida → recusa; outro endpoint (branch do Neon) ou outro host → permite", () => {
    expect(seedTargetAllowed("lixo", prod)).toBe(false)
    expect(seedTargetAllowed("postgres://u:p@localhost:5432/mylog_dev", prod)).toBe(true)
    expect(seedTargetAllowed("postgres://u:p@ep-xyz-999-pooler.c-4.us-east-1.aws.neon.tech/neondb", prod)).toBe(true)
  })
})
