"use server"

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { setSession, clearSession, getSession } from "@/lib/session"

export async function register(formData: FormData) {
  const name     = formData.get("name")?.toString().trim() ?? ""
  const email    = formData.get("email")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""
  const confirm  = formData.get("confirm")?.toString() ?? ""

  if (!name || !email || !password) return { error: "Preencha todos os campos." }
  if (password.length < 6)          return { error: "Senha deve ter no mínimo 6 caracteres." }
  if (password !== confirm)         return { error: "As senhas não coincidem." }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) return { error: "E-mail já cadastrado. Faça login." }

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: hashPassword(password) })
    .returning({ id: users.id })

  await setSession(user.id)
  redirect("/dashboard")
}

export async function login(formData: FormData) {
  const email    = formData.get("email")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""

  if (!email || !password) return { error: "Preencha e-mail e senha." }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.passwordHash) return { error: "E-mail ou senha incorretos." }
  if (!verifyPassword(password, user.passwordHash)) return { error: "E-mail ou senha incorretos." }

  await setSession(user.id)
  redirect("/dashboard")
}

export async function loginWithGoogle(googleId: string, email: string, name: string, avatarUrl?: string) {
  let [user] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)
  if (!user) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (byEmail) {
      await db.update(users).set({ googleId, avatarUrl }).where(eq(users.id, byEmail.id))
      user = { ...byEmail, googleId, avatarUrl: avatarUrl ?? null }
    } else {
      const [n] = await db.insert(users).values({ name, email, googleId, avatarUrl }).returning()
      user = n
    }
  }
  await setSession(user.id)
  redirect("/dashboard")
}

export async function logout() {
  await clearSession()
  redirect("/")
}

export async function requireUser() {
  const userId = await getSession()
  if (!userId) redirect("/")
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) { await clearSession(); redirect("/") }
  return user
}
