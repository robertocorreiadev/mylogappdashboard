import { describe, it, expect } from "vitest"
import { formatCurrency, formatDate, filterByPeriod, statusLabel } from "./format"

// Intl.NumberFormat("pt-BR", { style: "currency" }) usa NBSP (U+00A0) entre "R$" e o valor.
const NBSP = " "

describe("formatCurrency", () => {
  it("formata número em BRL", () => {
    expect(formatCurrency(1234.5)).toBe(`R$${NBSP}1.234,50`)
  })

  it("formata string numérica", () => {
    expect(formatCurrency("10")).toBe(`R$${NBSP}10,00`)
  })

  it("trata valores inválidos como zero", () => {
    expect(formatCurrency("abc")).toBe(`R$${NBSP}0,00`)
  })
})

describe("formatDate", () => {
  it("formata data no padrão pt-BR", () => {
    expect(formatDate("2026-03-05")).toBe("05/03/2026")
  })

  it("retorna travessão para valor nulo", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("retorna travessão para data inválida", () => {
    expect(formatDate("não-é-data")).toBe("—")
  })
})

describe("filterByPeriod", () => {
  const items = [
    { date: "2025-01-10" },
    { date: "2025-06-20" },
    { date: "2026-01-15" },
  ]

  it("retorna tudo quando ano e mês são nulos", () => {
    expect(filterByPeriod(items, null, null)).toHaveLength(3)
  })

  it("filtra por ano", () => {
    expect(filterByPeriod(items, 2025, null)).toHaveLength(2)
  })

  it("filtra por ano e mês (mês 0-indexado)", () => {
    expect(filterByPeriod(items, 2025, 0)).toEqual([{ date: "2025-01-10" }])
  })
})

describe("statusLabel", () => {
  it("traduz status conhecido", () => {
    expect(statusLabel("entregue")).toBe("Entregue")
  })

  it("retorna o próprio valor para status desconhecido", () => {
    expect(statusLabel("xyz")).toBe("xyz")
  })
})
