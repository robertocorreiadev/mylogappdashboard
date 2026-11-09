import { describe, it, expect } from "vitest"
import { recordGross, recordNet, netByQuinzena } from "./metrics"

// Boleta mínima: líquido = delivered * valuePerDelivery - expenses.
function rec(date: string, delivered: number, valuePerDelivery: string, expenses = "0") {
  return { date, delivered, valuePerDelivery, expenses }
}

describe("recordGross", () => {
  it("calcula entregas × valor, sem descontar despesas", () => {
    expect(recordGross(rec("2026-11-03", 10, "5.50", "15"))).toBe(55)
  })
})

describe("recordNet", () => {
  it("calcula bruto menos despesas", () => {
    expect(recordNet(rec("2026-11-03", 10, "5.50", "15"))).toBe(40)
  })

  it("aceita resultado negativo", () => {
    expect(recordNet(rec("2026-11-03", 1, "5", "20"))).toBe(-15)
  })
})

describe("netByQuinzena", () => {
  it("retorna null sem boletas", () => {
    expect(netByQuinzena([])).toBeNull()
  })

  it("põe o dia 15 na 1ª quinzena e o dia 16 na 2ª", () => {
    const q = netByQuinzena([rec("2026-11-15", 10, "10"), rec("2026-11-16", 5, "10")])
    expect(q).toMatchObject({
      year: 2026, month: 10,
      first: { net: 100, days: 1 },
      second: { net: 50, days: 1, lastDay: 16 },
    })
  })

  it("usa o mês da boleta mais recente, mesmo na virada de ano", () => {
    const q = netByQuinzena([rec("2025-12-28", 10, "10"), rec("2026-01-02", 3, "10")])
    expect(q).toMatchObject({ year: 2026, month: 0, first: { net: 30, days: 1 }, second: { net: 0, days: 0 } })
  })

  it("ignora boletas de outros meses", () => {
    const q = netByQuinzena([
      rec("2026-10-20", 100, "10"),
      rec("2026-11-01", 2, "10"),
      rec("2026-11-20", 4, "10"),
    ])
    expect(q?.first.net).toBe(20)
    expect(q?.second.net).toBe(40)
  })

  it("lastDay é o último dia com boleta na 2ª quinzena", () => {
    const q = netByQuinzena([rec("2026-11-28", 1, "10"), rec("2026-11-17", 1, "10"), rec("2026-11-22", 1, "10")])
    expect(q?.second).toEqual({ net: 30, days: 3, lastDay: 28 })
  })

  it("2ª quinzena sem boletas fica zerada", () => {
    const q = netByQuinzena([rec("2026-11-05", 1, "10")])
    expect(q?.second).toEqual({ net: 0, days: 0, lastDay: null })
  })

  it("days conta datas distintas, não boletas (visão do gestor junta entregadores)", () => {
    const q = netByQuinzena([
      rec("2026-11-03", 1, "10"), rec("2026-11-03", 2, "10"), rec("2026-11-03", 3, "10"),
      rec("2026-11-04", 1, "10"),
      rec("2026-11-20", 1, "10"), rec("2026-11-20", 1, "10"),
    ])
    expect(q?.first).toEqual({ net: 70, days: 2 })
    expect(q?.second).toEqual({ net: 20, days: 1, lastDay: 20 })
  })

  it("mantém líquido negativo", () => {
    const q = netByQuinzena([rec("2026-11-04", 1, "5", "30")])
    expect(q?.first.net).toBe(-25)
  })

  it("soma das quinzenas é o líquido do mês", () => {
    const rows = [
      rec("2026-11-01", 12, "6.5", "20"),
      rec("2026-11-14", 30, "6.5", "35.40"),
      rec("2026-11-16", 18, "6.5", "0"),
      rec("2026-11-29", 25, "6.5", "12.10"),
    ]
    const q = netByQuinzena(rows)!
    const total = rows.reduce((s, r) => s + recordNet(r), 0)
    expect(q.first.net + q.second.net).toBeCloseTo(total, 2)
  })
})
