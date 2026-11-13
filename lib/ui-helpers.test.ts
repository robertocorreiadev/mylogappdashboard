import { describe, it, expect } from "vitest"
import { sanitizeDecimalInput, decimalValue } from "./money"
import { periodOptions, periodLabel } from "./period"
import { lastValuePerDelivery, filterByDelivered } from "./boleta"
import { filterPackages } from "./package-filter"
import { formatCurrencyCompact, panelColor, normalizeSearch } from "./format"

describe("sanitizeDecimalInput (campo de R$ no celular)", () => {
  it("vírgula vira ponto", () => {
    expect(sanitizeDecimalInput("12,50")).toBe("12.50")
  })
  it("ponto e vírgula juntos: ponto é milhar, vírgula é decimal (pt-BR)", () => {
    expect(sanitizeDecimalInput("1.234,56")).toBe("1234.56")
  })
  it("um tipo de separador só: o primeiro é o decimal, os outros saem", () => {
    expect(sanitizeDecimalInput("3,5,0")).toBe("3.50")
    expect(sanitizeDecimalInput("2.5.1")).toBe("2.51")
  })
  it("no máximo 2 casas decimais", () => {
    expect(sanitizeDecimalInput("2,999")).toBe("2.99")
  })
  it("tira letras, espaço, sinal e R$", () => {
    expect(sanitizeDecimalInput("R$ -7,a5")).toBe("7.5")
  })
  it("vazio continua vazio; separador sozinho fica (o usuário está digitando)", () => {
    expect(sanitizeDecimalInput("")).toBe("")
    expect(sanitizeDecimalInput(",")).toBe(".")
  })
})

describe("decimalValue", () => {
  it("lê o texto já limpo; vazio ou inválido → 0", () => {
    expect(decimalValue("12.5")).toBe(12.5)
    expect(decimalValue("")).toBe(0)
    expect(decimalValue(".")).toBe(0)
  })
})

const recs = [
  { date: "2026-11-12", delivered: 62, valuePerDelivery: "2.00" },
  { date: "2025-12-31", delivered: 0, valuePerDelivery: "3.50" },
  { date: "2026-10-01", delivered: 40, valuePerDelivery: "1.80" },
]

describe("periodOptions", () => {
  it("anos do mais novo para o mais velho; meses do ano escolhido em ordem", () => {
    const o = periodOptions(recs, 2026)
    expect(o.years).toEqual([2026, 2025])
    expect(o.months).toEqual([9, 10])
  })
  it("sem ano escolhido, meses de todos os anos sem repetir", () => {
    expect(periodOptions(recs, null).months).toEqual([9, 10, 11])
  })
  it("junta várias listas (boletas + lançamentos)", () => {
    expect(periodOptions([...recs, { date: "2024-03-02" }], null).years).toEqual([2026, 2025, 2024])
  })
})

describe("periodLabel", () => {
  it("sem filtro → undefined; ano+mês; só ano; só mês", () => {
    expect(periodLabel(null, null)).toBeUndefined()
    expect(periodLabel(2026, 10)).toBe("Novembro/2026")
    expect(periodLabel(2026, null)).toBe("2026")
    expect(periodLabel(null, 0)).toBe("Janeiro (todos os anos)")
  })
})

describe("lastValuePerDelivery", () => {
  it("valor da boleta de data mais recente, com 2 casas", () => {
    expect(lastValuePerDelivery(recs)).toBe("2.00")
  })
  it("sem boletas → 3.50 (padrão antigo)", () => {
    expect(lastValuePerDelivery([])).toBe("3.50")
  })
})

describe("filterByDelivered", () => {
  it("com entregas / sem entregas / todas", () => {
    expect(filterByDelivered(recs, "with").map((r) => r.date)).toEqual(["2026-11-12", "2026-10-01"])
    expect(filterByDelivered(recs, "without").map((r) => r.date)).toEqual(["2025-12-31"])
    expect(filterByDelivered(recs, "all")).toHaveLength(3)
  })
})

describe("filterPackages", () => {
  const pk = [
    { trackingCode: "JL123BR", recipient: "Maria Souza", city: "Santos", status: "pendente" },
    { trackingCode: "XX999", recipient: "João", city: null, status: "entregue" },
  ]
  it("busca no código, destinatário e cidade, sem diferença de maiúsculas e acentos", () => {
    expect(filterPackages(pk, "jl123", "all")).toHaveLength(1)
    expect(filterPackages(pk, "joao", "all")).toHaveLength(1)
    expect(filterPackages(pk, "SANTOS", "all")).toHaveLength(1)
  })
  it("filtra por status; busca vazia não filtra", () => {
    expect(filterPackages(pk, "", "entregue").map((p) => p.trackingCode)).toEqual(["XX999"])
    expect(filterPackages(pk, "  ", "all")).toHaveLength(2)
  })
})

describe("formatCurrencyCompact (eixo dos gráficos)", () => {
  it("valores grandes ficam curtos e distintos", () => {
    const a = formatCurrencyCompact(1200)
    const b = formatCurrencyCompact(1500)
    expect(a).not.toBe(b)
    expect(a).toMatch(/R\$/)
    expect(a.length).toBeLessThanOrEqual(12)
  })
  it("valores pequenos não viram 0k repetido", () => {
    expect(formatCurrencyCompact(200)).not.toBe(formatCurrencyCompact(400))
  })
})

describe("panelColor e normalizeSearch (fonte única)", () => {
  it("cor do painel; painel desconhecido usa a cor de marca", () => {
    expect(panelColor("jadlog")).toBe("var(--panel-jadlog)")
    expect(panelColor("panel2")).toBe("var(--panel-2)")
    expect(panelColor("outro")).toBe("var(--primary)")
  })
  it("busca sem maiúsculas nem acentos", () => {
    expect(normalizeSearch("João Ávila")).toBe("joao avila")
  })
})
