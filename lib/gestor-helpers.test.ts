import { describe, it, expect } from "vitest"
import { auditItemLabel, formatAuditValue, formatDateTime } from "./audit-format"
import { memberStats, panelSummaries } from "./gestor-stats"

const NBSP = " "

describe("auditItemLabel (o item no lugar do #id)", () => {
  it("boleta pela data, pacote pelo código, lançamento pela descrição", () => {
    expect(auditItemLabel({ entityType: "daily_record", entityId: 7, snapshotBefore: null, snapshotAfter: { date: "2026-11-12" } }))
      .toBe("boleta de 12/11/2026")
    expect(auditItemLabel({ entityType: "delivery", entityId: 3, snapshotBefore: { trackingCode: "JL1BR" }, snapshotAfter: null }))
      .toBe("pacote JL1BR")
    expect(auditItemLabel({ entityType: "transaction", entityId: 9, snapshotBefore: null, snapshotAfter: { description: "PG Q1" } }))
      .toBe("lançamento \"PG Q1\"")
  })
  it("usuário pelo nome; entrada de auditoria pelo número", () => {
    expect(auditItemLabel({ entityType: "user", entityId: 4, snapshotBefore: { name: "Ana" }, snapshotAfter: null })).toBe("usuário Ana")
    expect(auditItemLabel({ entityType: "audit_log_entry", entityId: 12, snapshotBefore: {}, snapshotAfter: null })).toBe("entrada de auditoria #12")
  })
  it("sem foto do registro → tipo + #id (nunca quebra)", () => {
    expect(auditItemLabel({ entityType: "delivery", entityId: 5, snapshotBefore: null, snapshotAfter: null })).toBe("pacote #5")
    expect(auditItemLabel({ entityType: "outro", entityId: 1, snapshotBefore: "x", snapshotAfter: 3 })).toBe("outro #1")
  })
})

describe("formatAuditValue", () => {
  it("dinheiro em R$, status e tipo com rótulo, data em DD/MM/AAAA", () => {
    expect(formatAuditValue("expenses", "12.5")).toBe(`R$${NBSP}12,50`)
    expect(formatAuditValue("valuePerDelivery", 2)).toBe(`R$${NBSP}2,00`)
    expect(formatAuditValue("status", "em_transito")).toBe("Em trânsito")
    expect(formatAuditValue("type", "despesa")).toBe("Despesa")
    expect(formatAuditValue("date", "2026-11-03")).toBe("03/11/2026")
  })
  it("vazio vira travessão; o resto como texto", () => {
    expect(formatAuditValue("city", null)).toBe("—")
    expect(formatAuditValue("city", "")).toBe("—")
    expect(formatAuditValue("delivered", 62)).toBe("62")
  })
})

describe("formatDateTime", () => {
  it("data e hora em pt-BR", () => {
    expect(formatDateTime(new Date(2026, 10, 13, 9, 5))).toBe("13/11/2026 09:05")
  })
})

const recs = [
  { userId: 1, panel: "jadlog", date: "2026-11-10", delivered: 50, valuePerDelivery: "2.00", expenses: "10" },
  { userId: 1, panel: "panel2", date: "2026-11-12", delivered: 10, valuePerDelivery: "3.00", expenses: "0" },
  { userId: 2, panel: "jadlog", date: "2026-10-01", delivered: 5, valuePerDelivery: "2.00", expenses: "0" },
]

describe("memberStats (cartão do entregador no /gestor)", () => {
  it("separa por painel, nunca soma os painéis", () => {
    const m = memberStats(recs).get(1)!
    expect(m.byPanel.jadlog).toEqual({ delivered: 50, net: 90 })
    expect(m.byPanel.panel2).toEqual({ delivered: 10, net: 30 })
    expect(m).not.toHaveProperty("net")
  })
  it("última atividade = data da boleta mais recente", () => {
    expect(memberStats(recs).get(1)!.lastDate).toBe("2026-11-12")
    expect(memberStats(recs).get(2)!.lastDate).toBe("2026-10-01")
  })
  it("quem não tem boleta não aparece no mapa", () => {
    expect(memberStats(recs).get(3)).toBeUndefined()
  })
})

describe("panelSummaries (seletor de painel do /gestor)", () => {
  it("um resumo por painel padrão, mesmo sem dado", () => {
    const s = panelSummaries(recs.filter((r) => r.panel === "jadlog"))
    expect(s.map((p) => p.panel)).toEqual(["jadlog", "panel2"])
    expect(s[0]).toMatchObject({ delivered: 55, net: 100 })
    expect(s[1]).toMatchObject({ delivered: 0, net: 0 })
  })
})
