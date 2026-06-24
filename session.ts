import { cookies } from "next/headers"

const COOKIE = "jadlog_uid"

export async function getSession(): Promise<number | null> {
  const store = await cookies()
  const val   = store.get(COOKIE)?.value
  if (!val) return null
  const id = parseInt(val, 10)
  return isNaN(id) ? null : id
}

export async function setSession(userId: number) {
  const store = await cookies()
  store.set(COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
    maxAge:   60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(COOKIE)
}
