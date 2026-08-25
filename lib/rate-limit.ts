// Rate limit em memória para tentativas de login.
// Deliberadamente sem tabela/coluna no banco: evita depender de uma migração
// de schema (as migrações deste projeto são aplicadas manualmente no Neon,
// ver migrate-unique-fix.sql) que quebraria login em produção até ser rodada.
// Contrapartida aceita: o estado não é compartilhado entre instâncias/deploys
// e é reiniciado a cada cold start — funciona como mitigação best-effort para
// um app de baixo tráfego, não como proteção forte contra brute force distribuído.

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

type Entry = { count: number; firstAttempt: number; lockedUntil: number | null }

const attempts = new Map<string, Entry>()

function now() {
  return Date.now()
}

function keyFor(email: string) {
  return email.trim().toLowerCase()
}

export function isLocked(email: string): { locked: boolean; retryAfterMs: number } {
  const entry = attempts.get(keyFor(email))
  if (!entry?.lockedUntil) return { locked: false, retryAfterMs: 0 }
  const remaining = entry.lockedUntil - now()
  if (remaining <= 0) {
    attempts.delete(keyFor(email))
    return { locked: false, retryAfterMs: 0 }
  }
  return { locked: true, retryAfterMs: remaining }
}

export function registerFailedAttempt(email: string): void {
  const key = keyFor(email)
  const current = now()
  const entry = attempts.get(key)

  if (!entry || current - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: current, lockedUntil: null })
    return
  }

  const count = entry.count + 1
  const lockedUntil = count >= MAX_ATTEMPTS ? current + WINDOW_MS : null
  attempts.set(key, { count, firstAttempt: entry.firstAttempt, lockedUntil })
}

export function clearAttempts(email: string): void {
  attempts.delete(keyFor(email))
}
