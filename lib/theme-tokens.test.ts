import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// D15 (spec §15): o tema claro pinta certo hoje (conferido com next dev e no
// build, 2026-11-09). O risco é quebrar em silêncio: um token novo no :root
// sem a versão clara. Sem botão de tema, ninguém veria. Este teste trava isso.

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf-8")

function tokensOf(selector: string): Set<string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `bloco ${selector} não encontrado em globals.css`).toBeGreaterThanOrEqual(0)
  const body = css.slice(start, css.indexOf("}", start))
  return new Set([...body.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]))
}

// Tokens que não são cor e valem para os dois temas.
const SHARED = new Set(["radius"])

describe("tokens do tema", () => {
  const dark = tokensOf(":root")
  const light = tokensOf(':root[data-theme="light"]')

  it("todo token de cor do tema escuro existe no tema claro", () => {
    const missing = [...dark].filter((t) => !SHARED.has(t) && !light.has(t))
    expect(missing).toEqual([])
  })

  it("o tema claro não define token que o escuro não tem", () => {
    const extra = [...light].filter((t) => !dark.has(t))
    expect(extra).toEqual([])
  })

  it("Painel 2 tem a mesma lista de tokens nos dois temas", () => {
    expect([...tokensOf('[data-panel="panel2"]')].sort())
      .toEqual([...tokensOf(':root[data-theme="light"] [data-panel="panel2"]')].sort())
  })
})
