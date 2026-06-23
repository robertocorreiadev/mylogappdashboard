import { cookies } from "next/headers"

const COOKIE_NAME = "jadlog_user"

export type SessionUser = { id: number; email: string; name?: string };

export async function getUserId(): Promise<number | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function setUserId(userId: number) {
  const store = await cookies()
  store.set(COOKIE_NAME, String(userId), {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearUserId() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

