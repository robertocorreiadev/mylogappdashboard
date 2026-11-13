"use server"

import { cookies } from "next/headers"
import { parseTheme, THEME_COOKIE } from "@/lib/theme"

// Grava a preferência de tema. Não precisa de login: é só aparência.
export async function setTheme(value: string) {
  const theme = parseTheme(value)
  const store = await cookies()
  store.set(THEME_COOKIE, theme, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
  return { theme }
}
