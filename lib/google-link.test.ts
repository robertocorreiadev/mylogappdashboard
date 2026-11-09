import { describe, it, expect } from "vitest"
import { decideGoogleLink, isEmailAuthoritative } from "./google-link"

// D1 (spec §15): o e-mail do Google só vale para ligar ou criar conta quando
// é "autoritativo" — verificado E (@gmail.com OU conta Workspace com `hd`).

describe("isEmailAuthoritative", () => {
  it("aceita @gmail.com verificado", () => {
    expect(isEmailAuthoritative({ email: "Ana@Gmail.com", verified_email: true })).toBe(true)
  })

  it("aceita conta Workspace verificada com hd igual ao domínio do e-mail", () => {
    expect(isEmailAuthoritative({ email: "bob@empresa.com", verified_email: true, hd: "empresa.com" })).toBe(true)
  })

  it("recusa conta Google comum com e-mail de outro domínio, mesmo verificado", () => {
    expect(isEmailAuthoritative({ email: "alice@empresa.com", verified_email: true })).toBe(false)
  })

  it("recusa hd diferente do domínio do e-mail", () => {
    expect(isEmailAuthoritative({ email: "alice@vitima.com", verified_email: true, hd: "atacante.com" })).toBe(false)
  })

  it("recusa e-mail não verificado, mesmo @gmail.com", () => {
    expect(isEmailAuthoritative({ email: "ana@gmail.com", verified_email: false })).toBe(false)
  })

  it("só aceita verified_email === true (string ou ausente → recusa)", () => {
    expect(isEmailAuthoritative({ email: "ana@gmail.com", verified_email: "true" })).toBe(false)
    expect(isEmailAuthoritative({ email: "ana@gmail.com" })).toBe(false)
  })
})

describe("decideGoogleLink", () => {
  const G = "google-sub-123"

  it("usa a conta já ligada ao google_id, mesmo com e-mail não autoritativo", () => {
    expect(decideGoogleLink(G, { id: 7 }, { id: 9, googleId: null }, false)).toEqual({ action: "use", userId: 7 })
  })

  it("liga pelo e-mail quando o e-mail é autoritativo e a conta não tem Google", () => {
    expect(decideGoogleLink(G, null, { id: 9, googleId: null }, true)).toEqual({ action: "link", userId: 9 })
  })

  it("recusa ligar pelo e-mail quando o e-mail não é autoritativo", () => {
    expect(decideGoogleLink(G, null, { id: 9, googleId: null }, false)).toEqual({ action: "reject", reason: "google_unverified" })
  })

  it("recusa ligar uma conta que já está ligada a OUTRO google_id", () => {
    expect(decideGoogleLink(G, null, { id: 9, googleId: "outro-sub" }, true)).toEqual({ action: "reject", reason: "google_conflict" })
  })

  it("cria conta nova quando não há conta e o e-mail é autoritativo", () => {
    expect(decideGoogleLink(G, null, null, true)).toEqual({ action: "create" })
  })

  it("recusa criar conta com e-mail não autoritativo (evita pré-sequestro)", () => {
    expect(decideGoogleLink(G, null, null, false)).toEqual({ action: "reject", reason: "google_unverified" })
  })
})
