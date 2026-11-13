import { describe, it, expect } from "vitest"
import { navItems, isNavActive, drillDownBackHref } from "./nav"

const hrefs = (ctx: Parameters<typeof navItems>[0]) => navItems(ctx).map((i) => i.href)

describe("navItems", () => {
  it("entregador só vê os dois painéis", () => {
    expect(hrefs({ isAdmin: false, hasEntregador: true, hasGestor: false })).toEqual(["/dashboard", "/panel2"])
  })

  it("gestor só vê o painel do gestor e a auditoria", () => {
    expect(hrefs({ isAdmin: false, hasEntregador: false, hasGestor: true })).toEqual(["/gestor", "/gestor/auditoria"])
  })

  it("dual-role vê painéis, gestor e auditoria, nesta ordem", () => {
    expect(hrefs({ isAdmin: false, hasEntregador: true, hasGestor: true }))
      .toEqual(["/dashboard", "/panel2", "/gestor", "/gestor/auditoria"])
  })

  it("admin sem papel vê auditoria (global) e gestão, nunca o /gestor", () => {
    expect(hrefs({ isAdmin: true, hasEntregador: false, hasGestor: false })).toEqual(["/gestor/auditoria", "/gestao"])
  })

  it("admin com os dois papéis vê os 5 itens", () => {
    expect(hrefs({ isAdmin: true, hasEntregador: true, hasGestor: true }))
      .toEqual(["/dashboard", "/panel2", "/gestor", "/gestor/auditoria", "/gestao"])
  })

  it("sem papel e sem admin → nenhum item", () => {
    expect(hrefs({ isAdmin: false, hasEntregador: false, hasGestor: false })).toEqual([])
  })

  it("todo item tem rótulo curto de até 9 letras (cabe na barra de 375 px)", () => {
    for (const i of navItems({ isAdmin: true, hasEntregador: true, hasGestor: true })) {
      expect(i.shortLabel.length).toBeLessThanOrEqual(9)
    }
  })
})

describe("isNavActive", () => {
  it("rota exata", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true)
    expect(isNavActive("/panel2", "/dashboard")).toBe(false)
  })

  it("/gestor fica ativo no drill-down, mas não na auditoria", () => {
    expect(isNavActive("/gestor", "/gestor")).toBe(true)
    expect(isNavActive("/gestor", "/gestor/entregadores/4")).toBe(true)
    expect(isNavActive("/gestor", "/gestor/auditoria")).toBe(false)
    expect(isNavActive("/gestor/auditoria", "/gestor/auditoria")).toBe(true)
  })

  it("prefixo parecido não conta", () => {
    expect(isNavActive("/gestor", "/gestores")).toBe(false)
    expect(isNavActive("/gestao", "/gestao-x")).toBe(false)
  })
})

describe("drillDownBackHref", () => {
  it("gestor sempre volta ao /gestor", () => {
    expect(drillDownBackHref("gestor", undefined)).toBe("/gestor")
    expect(drillDownBackHref("gestor", "gestao")).toBe("/gestor")
  })

  it("admin volta para a tela de origem; sem origem, /gestao", () => {
    expect(drillDownBackHref("admin", "gestor")).toBe("/gestor")
    expect(drillDownBackHref("admin", "gestao")).toBe("/gestao")
    expect(drillDownBackHref("admin", undefined)).toBe("/gestao")
    expect(drillDownBackHref("admin", "https://evil.example")).toBe("/gestao")
  })
})
