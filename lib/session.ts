import { cookies } from "next/headers"
import crypto from "crypto"

const COOKIE_NAME = "jadlog_user"

export type SessionUser = { id: number; email: string; name?: string };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET não configurado")
  return secret
}

// Assina o userId para que o cookie não possa ser forjado/editado pelo usuário
// (ex: trocar o valor no DevTools para assumir a sessão de outra conta).
function sign(userId: number): string {
  const mac = crypto.createHmac("sha256", getSecret()).update(String(userId)).digest("hex")
  return `${userId}.${mac}`
}

function verify(value: string): number | null {
  const [idPart, mac] = value.split(".")
  if (!idPart || !mac) return null
  const expected = crypto.createHmac("sha256", getSecret()).update(idPart).digest("hex")
  const macBuf = Buffer.from(mac, "hex")
  const expectedBuf = Buffer.from(expected, "hex")
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null
  const parsed = Number(idPart)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function getUserId(): Promise<number | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  if (!value) return null
  return verify(value)
}

export async function setUserId(userId: number) {
  const store = await cookies()
  store.set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearUserId() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

