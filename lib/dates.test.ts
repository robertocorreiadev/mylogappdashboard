import { describe, it, expect } from "vitest"
import { localDateISO, todayISOIn } from "./dates"

// D2 (spec §15): "hoje" não pode vir de toISOString() (UTC).
describe("localDateISO", () => {
  it("usa a data local, não a UTC (23:30 local continua sendo o mesmo dia)", () => {
    expect(localDateISO(new Date(2026, 10, 9, 23, 30))).toBe("2026-11-09")
  })

  it("preenche mês e dia com 2 dígitos", () => {
    expect(localDateISO(new Date(2026, 0, 5, 8, 0))).toBe("2026-01-05")
  })
})

describe("todayISOIn", () => {
  it("01:30 UTC ainda é o dia anterior em São Paulo (UTC−3)", () => {
    expect(todayISOIn("America/Sao_Paulo", new Date("2026-11-10T01:30:00Z"))).toBe("2026-11-09")
  })

  it("não depende do padrão de data de um locale (monta AAAA-MM-DD pelas partes)", () => {
    expect(todayISOIn("UTC", new Date("2026-01-05T12:00:00Z"))).toMatch(/^2026-01-05$/)
  })

  it("03:00 UTC já é o dia seguinte em São Paulo", () => {
    expect(todayISOIn("America/Sao_Paulo", new Date("2026-11-10T03:00:00Z"))).toBe("2026-11-10")
  })
})
