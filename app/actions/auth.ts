"use server"

import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyPassword, hashPassword, isLegacyHash } from "@/lib/auth"
import { clearUserId, getUserId, setUserId } from "@/lib/session"

export async function requireUser() {
  const userId = await getUserId()
  if (!userId) throw new Error("Não autenticado")
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error("Usuário inválido")
  return user
}

export async function login(formData: FormData) {
  const email    = formData.get("email")?.toString().trim() || ""
  const password = formData.get("password")?.toString() || ""
  if (!email || !password) return { error: "E-mail e senha são obrigatórios." }
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user?.passwordHash) return { error: "E-mail ou senha inválidos." }
  if (!verifyPassword(password, user.passwordHash)) return { error: "E-mail ou senha inválidos." }
  // Migra silenciosamente contas com hash no formato antigo (HMAC) para scrypt.
  if (isLegacyHash(user.passwordHash)) {
    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id))
  }
  await setUserId(user.id)
  redirect("/select")
}

export async function register(formData: FormData) {
  const name     = formData.get("name")?.toString().trim() || ""
  const email    = formData.get("email")?.toString().trim().toLowerCase() || ""
  const password = formData.get("password")?.toString() || ""
  const confirm  = formData.get("confirm")?.toString() || ""
  if (!name)                         return { error: "Nome é obrigatório." }
  if (!email)                        return { error: "E-mail é obrigatório." }
  if (!password || password.length < 6) return { error: "Senha deve ter no mínimo 6 caracteres." }
  if (password !== confirm)          return { error: "As senhas não conferem." }
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) return { error: "Este e-mail já está cadastrado." }
  const [created] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).returning()
  await setUserId(created.id)
  redirect("/select")
}

export async function loginWithGoogle(googleId: string, email: string, name?: string | null, picture?: string | null) {
  const normalizedEmail = email.trim().toLowerCase()
  const [byGoogle] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)
  const [byEmail]  = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  const existing   = byGoogle ?? byEmail
  if (existing) {
    await db.update(users).set({
      googleId:  existing.googleId  ?? googleId,
      name:      existing.name      ?? (name ?? undefined),
      avatarUrl: existing.avatarUrl ?? (picture ?? undefined),
    }).where(eq(users.id, existing.id))
    await setUserId(existing.id)
    return
  }
  const [created] = await db.insert(users).values({
    name: name ?? email.split("@")[0], email: normalizedEmail, googleId, avatarUrl: picture ?? undefined,
  }).returning()
  await setUserId(created.id)
}

export async function logout() {
  await clearUserId()
  redirect("/")
}

// ── Alterar dados do perfil ───────────────────────────────────
export async function updateProfile(formData: FormData) {
  const user  = await requireUser()
  const name  = formData.get("name")?.toString().trim() || ""
  const email = formData.get("email")?.toString().trim().toLowerCase() || ""
  if (!name || !email) return { error: "Nome e e-mail são obrigatórios." }

  // Verifica se o novo e-mail já pertence a outro usuário
  if (email !== user.email) {
    const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (conflict && conflict.id !== user.id) return { error: "Este e-mail já está em uso." }
  }

  await db.update(users).set({ name, email }).where(eq(users.id, user.id))
  return { success: true }
}

// ── Alterar senha ─────────────────────────────────────────────
export async function changePassword(formData: FormData) {
  const user        = await requireUser()
  const current     = formData.get("current")?.toString() || ""
  const newPass     = formData.get("newPass")?.toString() || ""
  const confirmPass = formData.get("confirmPass")?.toString() || ""

  if (!current || !newPass || !confirmPass) return { error: "Preencha todos os campos." }
  if (newPass.length < 6)  return { error: "Nova senha deve ter no mínimo 6 caracteres." }
  if (newPass !== confirmPass) return { error: "As senhas não conferem." }

  // Usuários que só têm login Google não têm senha cadastrada
  if (!user.passwordHash) return { error: "Sua conta usa login com Google. Não é possível definir senha por aqui." }

  if (!verifyPassword(current, user.passwordHash)) return { error: "Senha atual incorreta." }

  await db.update(users).set({ passwordHash: hashPassword(newPass) }).where(eq(users.id, user.id))
  return { success: true }
}
