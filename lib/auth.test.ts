import { describe, it, expect } from "vitest"
import crypto from "crypto"
import { hashPassword, verifyPassword, isLegacyHash, isAdminEmail } from "./auth"

describe("hashPassword / verifyPassword", () => {
  it("verifica uma senha correta contra seu próprio hash", () => {
    const hash = hashPassword("minhaSenha123")
    expect(verifyPassword("minhaSenha123", hash)).toBe(true)
  })

  it("rejeita uma senha incorreta", () => {
    const hash = hashPassword("minhaSenha123")
    expect(verifyPassword("senhaErrada", hash)).toBe(false)
  })

  it("gera hashes diferentes (salt) para a mesma senha", () => {
    const a = hashPassword("repetida")
    const b = hashPassword("repetida")
    expect(a).not.toBe(b)
  })

  it("aceita o formato legado (HMAC-SHA256, salt:hash)", () => {
    // Simula um hash gerado pelo esquema antigo, sem depender de código já removido.
    const salt = "saltlegado"
    const hash = crypto.createHmac("sha256", salt).update("senhaAntiga").digest("hex")
    const legacy = `${salt}:${hash}`
    expect(verifyPassword("senhaAntiga", legacy)).toBe(true)
    expect(verifyPassword("outraSenha", legacy)).toBe(false)
  })

  it("rejeita formatos desconhecidos", () => {
    expect(verifyPassword("qualquer", "formato:invalido:demais:aqui")).toBe(false)
    expect(verifyPassword("qualquer", "semseparador")).toBe(false)
  })
})

describe("isLegacyHash", () => {
  it("identifica hash legado (2 partes)", () => {
    expect(isLegacyHash("salt:hash")).toBe(true)
  })

  it("não identifica hash scrypt (3 partes) como legado", () => {
    expect(isLegacyHash(hashPassword("x"))).toBe(false)
  })
})

describe("isAdminEmail", () => {
  const originalEnv = process.env.ADMIN_EMAIL

  it("compara e-mail ignorando maiúsculas/minúsculas", () => {
    process.env.ADMIN_EMAIL = "admin@example.com"
    expect(isAdminEmail("Admin@Example.com")).toBe(true)
    expect(isAdminEmail("outro@example.com")).toBe(false)
    process.env.ADMIN_EMAIL = originalEnv
  })

  it("retorna false quando ADMIN_EMAIL não está configurado", () => {
    delete process.env.ADMIN_EMAIL
    expect(isAdminEmail("qualquer@example.com")).toBe(false)
    process.env.ADMIN_EMAIL = originalEnv
  })
})
