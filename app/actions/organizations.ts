"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, organizations, memberships } from "@/lib/db/schema"
import { requireAdmin } from "@/app/actions/auth"
import { hashPassword } from "@/lib/auth"

function slugify(base: string) {
  return base
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "org"
}

async function uniqueSlug(base: string) {
  const slugBase = slugify(base)
  let slug = slugBase
  let suffix = 1
  while (true) {
    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1)
    if (!existing) return slug
    suffix += 1
    slug = `${slugBase}-${suffix}`
  }
}

// Provisionamento assistido pelo super-admin: cria uma organização e torna um
// usuário (existente ou recém-criado aqui) seu gestor. Fica em /gestao,
// nunca na tela pública de login — só o ADMIN_EMAIL chega até aqui.
export async function createOrganizationForGestor(formData: FormData) {
  await requireAdmin()

  const orgName = formData.get("orgName")?.toString().trim() || ""
  const mode    = formData.get("mode")?.toString() === "new" ? "new" : "existing"
  if (!orgName) return { error: "Nome da organização é obrigatório." }

  let userId: number

  if (mode === "existing") {
    userId = Number(formData.get("userId"))
    if (!userId) return { error: "Selecione um usuário." }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return { error: "Usuário não encontrado." }
  } else {
    const name     = formData.get("name")?.toString().trim() || ""
    const email    = formData.get("email")?.toString().trim().toLowerCase() || ""
    const password = formData.get("password")?.toString() || ""
    if (!name)  return { error: "Nome do gestor é obrigatório." }
    if (!email) return { error: "E-mail do gestor é obrigatório." }
    if (!password || password.length < 6) return { error: "Senha deve ter no mínimo 6 caracteres." }
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing) return { error: "Este e-mail já está cadastrado." }
    const [created] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).returning()
    userId = created.id
  }

  const [existingGestor] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.role, "gestor"), eq(memberships.status, "active")))
    .limit(1)
  if (existingGestor) return { error: "Este usuário já é gestor de uma organização." }

  const slug = await uniqueSlug(orgName)
  const [org] = await db.insert(organizations).values({ name: orgName, slug, ownerUserId: userId }).returning()
  await db.insert(memberships).values({ organizationId: org.id, userId, role: "gestor" })

  revalidatePath("/gestao")
  return { success: true }
}
