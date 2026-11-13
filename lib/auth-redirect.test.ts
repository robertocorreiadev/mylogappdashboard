import { describe, it, expect } from "vitest"
import { safeLogoutRedirect } from "./auth-redirect"

describe("safeLogoutRedirect (para onde ir depois de sair)", () => {
  it("sem destino → login", () => {
    expect(safeLogoutRedirect(null)).toBe("/")
    expect(safeLogoutRedirect("")).toBe("/")
  })
  it("aceita só a página de um convite", () => {
    expect(safeLogoutRedirect("/convite/abcDEF123_-")).toBe("/convite/abcDEF123_-")
  })
  it("recusa qualquer outro destino (open redirect)", () => {
    expect(safeLogoutRedirect("https://evil.example/convite/x")).toBe("/")
    expect(safeLogoutRedirect("//evil.example/convite/x")).toBe("/")
    expect(safeLogoutRedirect("/convite/../gestao")).toBe("/")
    expect(safeLogoutRedirect("/convite/x?y=1")).toBe("/")
    expect(safeLogoutRedirect("/gestao")).toBe("/")
    expect(safeLogoutRedirect("/convite/")).toBe("/")
  })
})
