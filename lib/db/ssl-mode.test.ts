import { describe, it, expect } from "vitest"
import { withVerifyFullSsl } from "./ssl-mode"

// A integração Neon da Vercel gera DATABASE_URL com sslmode=require e não
// deixa editar. O pg 8.22 avisa que require vira mais fraco no pg 9; o app
// pede verify-full explicitamente (mesmo comportamento de hoje).
describe("withVerifyFullSsl", () => {
  it("troca require, prefer e verify-ca por verify-full", () => {
    expect(withVerifyFullSsl("postgres://u:p@h/db?sslmode=require")).toBe("postgres://u:p@h/db?sslmode=verify-full")
    expect(withVerifyFullSsl("postgres://u:p@h/db?sslmode=prefer&x=1")).toBe("postgres://u:p@h/db?sslmode=verify-full&x=1")
    expect(withVerifyFullSsl("postgres://u:p@h/db?a=1&sslmode=verify-ca")).toBe("postgres://u:p@h/db?a=1&sslmode=verify-full")
  })
  it("mantém o resto da URL (channel_binding, senha com caracteres especiais)", () => {
    expect(withVerifyFullSsl("postgres://u:p%40ss@h/db?sslmode=require&channel_binding=require"))
      .toBe("postgres://u:p%40ss@h/db?sslmode=verify-full&channel_binding=require")
  })
  it("não mexe em verify-full, disable, sem sslmode ou vazio", () => {
    expect(withVerifyFullSsl("postgres://u:p@h/db?sslmode=verify-full")).toBe("postgres://u:p@h/db?sslmode=verify-full")
    expect(withVerifyFullSsl("postgres://u:p@localhost/db?sslmode=disable")).toBe("postgres://u:p@localhost/db?sslmode=disable")
    expect(withVerifyFullSsl("postgres://u:p@localhost/db")).toBe("postgres://u:p@localhost/db")
    expect(withVerifyFullSsl(undefined)).toBeUndefined()
  })
})
