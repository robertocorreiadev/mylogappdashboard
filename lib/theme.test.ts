import { describe, it, expect } from "vitest"
import { parseTheme, THEME_COOKIE, themeColor } from "./theme"

describe("parseTheme", () => {
  it("aceita 'light' e 'dark'", () => {
    expect(parseTheme("light")).toBe("light")
    expect(parseTheme("dark")).toBe("dark")
  })

  it("sem cookie ou valor desconhecido → escuro (padrão do app)", () => {
    expect(parseTheme(undefined)).toBe("dark")
    expect(parseTheme("")).toBe("dark")
    expect(parseTheme("LIGHT")).toBe("dark")
    expect(parseTheme("<script>")).toBe("dark")
  })
})

describe("themeColor", () => {
  it("é a cor de fundo de cada tema (barra do navegador no celular)", () => {
    expect(themeColor("dark")).toBe("#0f1117")
    expect(themeColor("light")).toBe("#f4f5f8")
  })
})

it("nome do cookie é estável (mudar desloga a preferência de todo mundo)", () => {
  expect(THEME_COOKIE).toBe("theme")
})
