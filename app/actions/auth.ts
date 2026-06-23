"use server"

import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyPassword, hashPassword } from "@/auth"
import { clearUserId, getUserId, setUserId } from "@/lib/session"

export async function requireUser() {
  const userId = await getUserId()
  if (!userId) throw new Error("Não autenticado")

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error("Usuário inválido")
  return user
}

export async function login(formData: FormData) {
  const email = formData.get("email")?.toString().trim() || ""
  const password = formData.get("password")?.toString() || ""

  if (!email || !password) return { error: "E-mail e senha são obrigatórios." }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user?.passwordHash) return { error: "E-mail ou senha inválidos." }

  const ok = verifyPassword(password, user.passwordHash)
  if (!ok) return { error: "E-mail ou senha inválidos." }

  await setUserId(user.id)
  redirect("/dashboard")
}

export async function register(formData: FormData) {
  const name = formData.get("name")?.toString().trim() || ""
  const email = formData.get("email")?.toString().trim().toLowerCase() || ""
  const password = formData.get("password")?.toString() || ""
  const confirm = formData.get("confirm")?.toString() || ""

  if (!name) return { error: "Nome é obrigatório." }
  if (!email) return { error: "E-mail é obrigatório." }
  if (!password || password.length < 6) return { error: "Senha deve ter no mínimo 6 caracteres." }
  if (password !== confirm) return { error: "As senhas não conferem." }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) return { error: "Este e-mail já está cadastrado." }

  const passwordHash = hashPassword(password)

  const [created] = await db.insert(users).values({
    name,
    email,
    passwordHash,
  }).returning()

  await setUserId(created.id)
  redirect("/dashboard")
}

export async function loginWithGoogle(googleId: string, email: string, name?: string | null, picture?: string | null) {
  const normalizedEmail = email.trim().toLowerCase()

  // Upsert por googleId ou email
  const existingByGoogle = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)
  const existingByEmail = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  const existing = existingByGoogle[0] ?? existingByEmail[0]

  if (existing) {
    await db
      .update(users)
      .set({
        googleId: existing.googleId ?? googleId,
        name: existing.name ?? (name ?? undefined),
        avatarUrl: existing.avatarUrl ?? (picture ?? undefined),
      })
      .where(eq(users.id, existing.id))

    await setUserId(existing.id)
    redirect("/dashboard")
  }

  const [created] = await db
    .insert(users)
    .values({
      name: name ?? email.split("@")[0],
      email: normalizedEmail,
      googleId,
      avatarUrl: picture ?? undefined,
    })
    .returning()

  await setUserId(created.id)
  redirect("/dashboard")
}

export async function logout() {
  await clearUserId()
  redirect("/")
}



