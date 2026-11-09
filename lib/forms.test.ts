import { describe, it, expect } from "vitest"
import {
  parseMoney, parseCount, parseISODate, parseRecordId, isDeliveryStatus,
  parseDailyRecordForm, parseDeliveryForm, parseTransactionForm,
} from "./forms"

// D3/D12 (spec §15): validação no servidor, devolvendo { error } em vez de
// erro 500 do Postgres ou exceção.

function fd(fields: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

describe("parseMoney", () => {
  it("aceita ponto e vírgula decimal e normaliza", () => {
    expect(parseMoney("12.5", "Valor")).toEqual({ ok: true, value: "12.5" })
    expect(parseMoney("12,50", "Valor")).toEqual({ ok: true, value: "12.50" })
  })
  it("vazio vira 0", () => {
    expect(parseMoney("  ", "Valor")).toEqual({ ok: true, value: "0" })
  })
  it("aceita '.5', ',5' e '3.' (o input number e o Postgres aceitam) e normaliza", () => {
    expect(parseMoney(".5", "Valor")).toEqual({ ok: true, value: "0.5" })
    expect(parseMoney(",5", "Valor")).toEqual({ ok: true, value: "0.5" })
    expect(parseMoney("3.", "Valor")).toEqual({ ok: true, value: "3" })
  })
  it("recusa negativo, texto, mais de 2 casas e valor grande demais", () => {
    for (const raw of ["-1", "abc", "1.234", "1e3", "100000000"]) {
      expect(parseMoney(raw, "Valor")).toEqual({ ok: false, error: expect.stringContaining("Valor") })
    }
  })
})

describe("parseCount", () => {
  it("aceita inteiro ≥ 0 e vazio vira 0", () => {
    expect(parseCount("12", "Entregas")).toEqual({ ok: true, value: 12 })
    expect(parseCount("", "Entregas")).toEqual({ ok: true, value: 0 })
  })
  it("recusa negativo, decimal, texto e acima do limite", () => {
    for (const raw of ["-3", "2.5", "dez", "100001"]) {
      expect(parseCount(raw, "Entregas")).toEqual({ ok: false, error: expect.stringContaining("Entregas") })
    }
  })
})

describe("parseISODate", () => {
  it("aceita AAAA-MM-DD válido", () => {
    expect(parseISODate("2026-02-28", "Data")).toEqual({ ok: true, value: "2026-02-28" })
  })
  it("recusa formato errado e data que não existe", () => {
    for (const raw of ["28/02/2026", "2026-02-30", "2026-13-01", "abc", ""]) {
      expect(parseISODate(raw, "Data").ok).toBe(false)
    }
  })
})

describe("parseRecordId", () => {
  it("aceita inteiro positivo", () => {
    expect(parseRecordId("42")).toEqual({ ok: true, value: 42 })
  })
  it("recusa vazio, zero, negativo e texto", () => {
    for (const raw of ["", "0", "-1", "abc", "1.5"]) expect(parseRecordId(raw).ok).toBe(false)
  })
})

describe("isDeliveryStatus", () => {
  it("aceita só os status da lista", () => {
    expect(isDeliveryStatus("entregue")).toBe(true)
    expect(isDeliveryStatus("sumiu")).toBe(false)
  })
})

describe("parseDailyRecordForm", () => {
  const ok = { panel: "jadlog", date: "2026-11-09", valuePerDelivery: "3.50", delivered: "40", scheduled: "2", occurrences: "1", expenses: "15,90" }

  it("devolve os valores normalizados", () => {
    expect(parseDailyRecordForm(fd(ok))).toEqual({
      ok: true,
      value: { panel: "jadlog", date: "2026-11-09", valuePerDelivery: "3.50", delivered: 40, scheduled: 2, occurrences: 1, expenses: "15.90" },
    })
  })

  it("valor por entrega vazio usa o padrão 3.50", () => {
    const r = parseDailyRecordForm(fd({ ...ok, valuePerDelivery: "" }))
    expect(r.ok && r.value.valuePerDelivery).toBe("3.50")
  })

  it("sem data → mensagem de sempre", () => {
    expect(parseDailyRecordForm(fd({ ...ok, date: "" }))).toEqual({ ok: false, error: "Selecione uma data." })
  })

  it("recusa entregas negativas, despesa em texto e painel desconhecido", () => {
    expect(parseDailyRecordForm(fd({ ...ok, delivered: "-5" })).ok).toBe(false)
    expect(parseDailyRecordForm(fd({ ...ok, expenses: "muito" })).ok).toBe(false)
    expect(parseDailyRecordForm(fd({ ...ok, panel: "outro" })).ok).toBe(false)
  })

  it("recusa chaves herdadas do Object.prototype como painel", () => {
    for (const panel of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(parseDailyRecordForm(fd({ ...ok, panel })).ok).toBe(false)
    }
  })
})

describe("parseDeliveryForm", () => {
  const ok = { panel: "panel2", trackingCode: " BR123 ", recipient: "Ana", address: "", city: "Rio", status: "pendente", value: "", deadline: "" }

  it("normaliza campos opcionais vazios para null e valor vazio para 0", () => {
    expect(parseDeliveryForm(fd(ok))).toEqual({
      ok: true,
      value: { panel: "panel2", trackingCode: "BR123", recipient: "Ana", address: null, city: "Rio", status: "pendente", value: "0", deadline: null },
    })
  })

  it("obrigatórios ausentes → { error } (não lança)", () => {
    expect(parseDeliveryForm(fd({ ...ok, recipient: "" }))).toEqual({ ok: false, error: "Código de rastreio e destinatário são obrigatórios." })
  })

  it("recusa status desconhecido, valor negativo e prazo inválido", () => {
    expect(parseDeliveryForm(fd({ ...ok, status: "sumiu" })).ok).toBe(false)
    expect(parseDeliveryForm(fd({ ...ok, value: "-2" })).ok).toBe(false)
    expect(parseDeliveryForm(fd({ ...ok, deadline: "2026-02-31" })).ok).toBe(false)
  })
})

describe("parseTransactionForm", () => {
  const ok = { panel: "jadlog", type: "despesa", description: " Combustível ", category: "", amount: "80", date: "2026-11-09" }

  it("devolve os valores normalizados", () => {
    expect(parseTransactionForm(fd(ok), "2026-11-10")).toEqual({
      ok: true,
      value: { panel: "jadlog", type: "despesa", description: "Combustível", category: null, amount: "80", date: "2026-11-09" },
    })
  })

  it("sem data usa o 'hoje' recebido (fuso de São Paulo, D2)", () => {
    const r = parseTransactionForm(fd({ ...ok, date: "" }), "2026-11-10")
    expect(r.ok && r.value.date).toBe("2026-11-10")
  })

  it("sem descrição → { error } (não lança)", () => {
    expect(parseTransactionForm(fd({ ...ok, description: "  " }), "2026-11-10"))
      .toEqual({ ok: false, error: "Descrição obrigatória." })
  })

  it("recusa tipo desconhecido e valor inválido", () => {
    expect(parseTransactionForm(fd({ ...ok, type: "doacao" }), "2026-11-10").ok).toBe(false)
    expect(parseTransactionForm(fd({ ...ok, amount: "-80" }), "2026-11-10").ok).toBe(false)
  })
})
