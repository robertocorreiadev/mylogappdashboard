import { cookies } from "next/headers"

export const PROFILES = {
  claudio: { id: "claudio", name: "Cláudio 2026" },
  roberto: { id: "roberto", name: "Roberto 2026" },
} as const

export type ProfileId = keyof typeof PROFILES

const COOKIE_NAME = "jadlog_profile"

export function isValidProfile(value: string | undefined | null): value is ProfileId {
  return value === "claudio" || value === "roberto"
}

export async function getProfile(): Promise<ProfileId | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  return isValidProfile(value) ? value : null
}

export async function setProfile(profile: ProfileId) {
  const store = await cookies()
  store.set(COOKIE_NAME, profile, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearProfile() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
