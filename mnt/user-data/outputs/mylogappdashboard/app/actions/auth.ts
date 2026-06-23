"use server"

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { setSession, clearSession, getSession } from "@/lib/session"

// ── Cadastro ─────────────────────────────────────────────────
export async function register(formData: FormData) {
  const name     = formData.get("name")?.toString().trim() ?? ""
  const email    = formData.get("email")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""
  const confirm  = formData.get("confirm")?.toString() ?? ""

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos." }
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." }
  }
  if (password !== confirm) {
    return { error: "As senhas não coincidem." }
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    return { error: "Este e-mail já está cadastrado." }
  }

  const passwordHash = hashPassword(password)
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id })

  await setSession(user.id)
  redirect("/dashboard")
}

// ── Login com email/senha ────────────────────────────────────
export async function login(formData: FormData) {
  const email    = formData.get("email")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." }
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.passwordHash) {
    return { error: "E-mail ou senha incorretos." }
  }

  const valid = verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { error: "E-mail ou senha incorretos." }
  }

  await setSession(user.id)
  redirect("/dashboard")
}

// ── Login com Google (OAuth callback) ───────────────────────
export async function loginWithGoogle(googleId: string, email: string, name: string, avatarUrl?: string) {
  // Busca usuário existente pelo googleId
  let [user] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)

  if (!user) {
    // Verifica se já existe conta com esse e-mail
    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (byEmail) {
      // Vincula o Google ao cadastro existente
      await db.update(users).set({ googleId, avatarUrl }).where(eq(users.id, byEmail.id))
      user = { ...byEmail, googleId, avatarUrl: avatarUrl ?? null }
    } else {
      // Cria conta nova via Google
      const [newUser] = await db
        .insert(users)
        .values({ name, email, googleId, avatarUrl })
        .returning({ id: users.id, name: users.name, email: users.email, googleId: users.googleId, avatarUrl: users.avatarUrl, passwordHash: users.passwordHash, createdAt: users.createdAt })
      user = newUser
    }
  }

  await setSession(user.id)
  redirect("/dashboard")
}

// ── Logout ───────────────────────────────────────────────────
export async function logout() {
  await clearSession()
  redirect("/")
}

// ── Helper: usuário logado ou redireciona ────────────────────
export async function requireUser() {
  const userId = await getSession()
  if (!userId) redirect("/")
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    await clearSession()
    redirect("/")
  }
  return user
}
