"use server"

import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, memberships } from "@/lib/db/schema"
import { verifyPassword, hashPassword, isLegacyHash, isAdminEmail } from "@/lib/auth"
import { clearUserId, getUserId, setUserId } from "@/lib/session"
import { isLocked, registerFailedAttempt, clearAttempts } from "@/lib/rate-limit"
import { createSoloOrgForNewUser } from "@/lib/db/onboarding"
import { acceptInvite } from "@/lib/invites"

export async function requireUser() {
  const userId = await getUserId()
  if (!userId) throw new Error("Não autenticado")
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error("Usuário inválido")
  return user
}

// ── Acesso restrito de administração ──────────────────────────
export async function requireAdmin() {
  const user = await requireUser()
  if (!isAdminEmail(user.email)) throw new Error("Acesso restrito.")
  return user
}

// ── Organização / papel (gestor | entregador) ───────────────────
// Um usuário pode ter no máximo uma membership "active" POR PAPEL — pode
// acumular 'gestor' + 'entregador' simultaneamente (dual-role), mas nunca
// duas do mesmo papel. Por isso requireGestor()/requireEntregador() buscam
// especificamente o papel pedido, em vez de assumir "a" membership do usuário.
export type MembershipContext = {
  user: Awaited<ReturnType<typeof requireUser>>
  organizationId: number
  role: "gestor" | "entregador"
  membershipId: number
}

// `knownUser` deixa o chamador reaproveitar um `requireUser()` já feito no
// mesmo request (ex.: a página resolve o usuário uma vez e repassa pras
// server actions que ela mesma invoca) em vez de repetir o SELECT — quando
// omitido, o comportamento é idêntico ao de antes (resolve sozinho).
export async function requireMembership(
  role?: "gestor" | "entregador",
  knownUser?: Awaited<ReturnType<typeof requireUser>>,
): Promise<MembershipContext> {
  const user = knownUser ?? await requireUser()
  const conditions = [eq(memberships.userId, user.id), eq(memberships.status, "active")]
  if (role) conditions.push(eq(memberships.role, role))
  const [membership] = await db.select().from(memberships).where(and(...conditions)).limit(1)
  if (!membership) throw new Error(role ? `Sem acesso como ${role}.` : "Nenhuma organização vinculada.")
  return {
    user,
    organizationId: membership.organizationId,
    role: membership.role as "gestor" | "entregador",
    membershipId: membership.id,
  }
}

export async function requireGestor(knownUser?: Awaited<ReturnType<typeof requireUser>>) {
  return requireMembership("gestor", knownUser)
}

export async function requireEntregador(knownUser?: Awaited<ReturnType<typeof requireUser>>) {
  return requireMembership("entregador", knownUser)
}

// ── Modo de visualização (gestor normal vs. ADMIN MASTER) ───────
// Ponto único que decide "isso é o admin master ou um gestor normal?" — antes
// dessa consolidação, isAdminEmail() era checado ad-hoc em cada página que
// precisava distinguir os dois modos. Não é bug hoje (cada chamada delega pra
// mesma fonte única em lib/auth.ts), mas é um padrão frágil: se o conceito de
// "admin" mudar no futuro (múltiplos admins, flag no banco), só este helper
// precisa mudar. Uso pensado pra telas onde os dois modos são EXCLUSIVOS
// (ex.: /gestor/entregadores/[userId], que usa admin-override OU o
// drill-down normal do gestor, nunca os dois) — uma tela onde "é admin" é só
// um flag adicional sobre um requireGestor() sempre obrigatório (ex.:
// /gestor/auditoria) continua resolvendo os dois fatos separadamente.
export type ViewerMode =
  | { mode: "admin"; user: Awaited<ReturnType<typeof requireUser>> }
  | ({ mode: "gestor" } & MembershipContext)

export async function resolveViewerMode(): Promise<ViewerMode> {
  const user = await requireUser()
  if (isAdminEmail(user.email)) return { mode: "admin", user }
  const ctx = await requireGestor(user)
  return { mode: "gestor", ...ctx }
}

// Não lança erro — usado por /select para decidir quais opções mostrar
// (ex.: conta dual-role vê o seletor gestor/entregador; conta só-entregador
// nunca vê nada relacionado a gestor).
export async function getActiveRoles(): Promise<Array<"gestor" | "entregador">> {
  const userId = await getUserId()
  if (!userId) return []
  const rows = await db.select({ role: memberships.role }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
  return rows.map((r) => r.role as "gestor" | "entregador")
}

export async function login(formData: FormData) {
  const email    = formData.get("email")?.toString().trim().toLowerCase() || ""
  const password = formData.get("password")?.toString() || ""
  if (!email || !password) return { error: "E-mail e senha são obrigatórios." }

  const { locked, retryAfterMs } = isLocked(email)
  if (locked) {
    const minutes = Math.ceil(retryAfterMs / 60000)
    return { error: `Muitas tentativas. Tente novamente em ${minutes} min.` }
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    registerFailedAttempt(email)
    return { error: "E-mail ou senha inválidos." }
  }
  clearAttempts(email)
  // Migra silenciosamente contas com hash no formato antigo (HMAC) para scrypt.
  if (isLegacyHash(user.passwordHash)) {
    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, user.id))
  }
  await setUserId(user.id)
  // Login a partir de /convite/[token]: aceite best-effort — se falhar (ex.:
  // já é entregador de outra org), o usuário simplesmente segue logado sem
  // o novo vínculo, sem bloquear o login em si.
  const inviteToken = formData.get("inviteToken")?.toString().trim() || null
  if (inviteToken) await acceptInvite(inviteToken, user.id)
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

  // Cadastro via /convite/[token]: entra como entregador da org do convite
  // em vez de ganhar organização solo. Se o convite não puder ser aceito
  // (ex.: expirou entre o carregamento da página e o submit), cai no
  // fallback solo para a conta não ficar sem nenhuma organização.
  const inviteToken = formData.get("inviteToken")?.toString().trim() || null
  const joinedViaInvite = inviteToken ? (await acceptInvite(inviteToken, created.id)).success : false
  if (!joinedViaInvite) await createSoloOrgForNewUser(created.id, created.name)

  await setUserId(created.id)
  redirect("/select")
}

export async function loginWithGoogle(
  googleId: string,
  email: string,
  name?: string | null,
  picture?: string | null,
  inviteToken?: string | null,
) {
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
    if (inviteToken) await acceptInvite(inviteToken, existing.id)
    return
  }
  const [created] = await db.insert(users).values({
    name: name ?? email.split("@")[0], email: normalizedEmail, googleId, avatarUrl: picture ?? undefined,
  }).returning()
  const joinedViaInvite = inviteToken ? (await acceptInvite(inviteToken, created.id)).success : false
  if (!joinedViaInvite) await createSoloOrgForNewUser(created.id, created.name)
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
