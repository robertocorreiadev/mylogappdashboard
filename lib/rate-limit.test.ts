import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { isLocked, registerFailedAttempt, clearAttempts } from "./rate-limit"

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("não bloqueia antes de atingir o limite de tentativas", () => {
    const email = "user1@example.com"
    for (let i = 0; i < 4; i++) registerFailedAttempt(email)
    expect(isLocked(email).locked).toBe(false)
  })

  it("bloqueia após 5 tentativas falhas", () => {
    const email = "user2@example.com"
    for (let i = 0; i < 5; i++) registerFailedAttempt(email)
    expect(isLocked(email).locked).toBe(true)
  })

  it("desbloqueia depois que a janela de tempo expira", () => {
    const email = "user3@example.com"
    for (let i = 0; i < 5; i++) registerFailedAttempt(email)
    expect(isLocked(email).locked).toBe(true)

    vi.setSystemTime(new Date("2026-01-01T00:16:00Z")) // +16min
    expect(isLocked(email).locked).toBe(false)
  })

  it("clearAttempts remove o bloqueio (ex.: login bem-sucedido)", () => {
    const email = "user4@example.com"
    for (let i = 0; i < 5; i++) registerFailedAttempt(email)
    expect(isLocked(email).locked).toBe(true)

    clearAttempts(email)
    expect(isLocked(email).locked).toBe(false)
  })

  it("trata e-mail de forma case-insensitive", () => {
    const email = "User5@Example.com"
    for (let i = 0; i < 5; i++) registerFailedAttempt(email)
    expect(isLocked("user5@example.com").locked).toBe(true)
  })
})
