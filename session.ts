import { cookies } from "next/headers"

const COOKIE_NAME = "jadlog_session"

export async function getSession(): Promise<number | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  if (!value) return null
  const id = parseInt(value, 10)
  return isNaN(id) ? null : id
}

export async function setSession(userId: number) {
  const store = await cookies()
  store.set(COOKIE_NAME, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
