"use server"

import { eq, ne, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth"
import { requireAdmin } from "@/app/actions/auth"

export async function getAllUsers() {
  await requireAdmin()
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      googleId: users.googleId,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name)
}

export async function updateUserAdmin(formData: FormData) {
  await requireAdmin()
  const id    = Number(formData.get("id"))
  const name  = formData.get("name")?.toString().trim() || ""
  const email = formData.get("email")?.toString().trim().toLowerCase() || ""
  if (!id)             return { error: "Usuário inválido." }
  if (!name || !email) return { error: "Nome e e-mail são obrigatórios." }

  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, id)))
    .limit(1)
  if (conflict) return { error: "Este e-mail já está em uso por outro usuário." }

  await db.update(users).set({ name, email }).where(eq(users.id, id))
  revalidatePath("/usuarios")
  return { success: true }
}

export async function setUserPasswordAdmin(formData: FormData) {
  await requireAdmin()
  const id          = Number(formData.get("id"))
  const newPass     = formData.get("newPass")?.toString() || ""
  const confirmPass = formData.get("confirmPass")?.toString() || ""
  if (!id) return { error: "Usuário inválido." }
  if (newPass.length < 6)      return { error: "Nova senha deve ter no mínimo 6 caracteres." }
  if (newPass !== confirmPass) return { error: "As senhas não conferem." }

  await db.update(users).set({ passwordHash: hashPassword(newPass) }).where(eq(users.id, id))
  revalidatePath("/usuarios")
  return { success: true }
}

export async function deleteUserAdmin(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id"))
  if (!id) return { error: "Usuário inválido." }
  if (id === admin.id) return { error: "Você não pode excluir sua própria conta por aqui." }

  await db.delete(users).where(eq(users.id, id))
  revalidatePath("/usuarios")
  return { success: true }
}
