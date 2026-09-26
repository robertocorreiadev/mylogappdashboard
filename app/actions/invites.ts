"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { invites, users } from "@/lib/db/schema"
import { requireGestor, requireUser, type MembershipContext } from "@/app/actions/auth"
import { generateInviteToken, hashInviteToken, acceptInvite } from "@/lib/invites"

// Dias até expirar. "0" = sem expiração prática (100 anos) — a coluna
// expires_at é NOT NULL no schema, então "sem expiração" é simulado com uma
// data bem distante em vez de mudar o schema em produção por causa disso.
const EXPIRY_OPTIONS: Record<string, number> = { "1": 1, "7": 7, "30": 30, "0": 365 * 100 }

// Sem biblioteca de e-mail no projeto — MVP é link copiável, o gestor
// compartilha por fora (WhatsApp, etc.). Token em texto puro nunca é
// persistido nem logado, só devolvido uma vez na resposta desta action.
export async function createInvite(formData: FormData) {
  const { organizationId, user } = await requireGestor()
  const email = formData.get("email")?.toString().trim().toLowerCase() || null
  const expiresInDays = EXPIRY_OPTIONS[formData.get("expiresInDays")?.toString() ?? "7"] ?? 7

  const token = generateInviteToken()
  const tokenHash = hashInviteToken(token)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  await db.insert(invites).values({
    organizationId, tokenHash, role: "entregador", email, createdByUserId: user.id, expiresAt,
  })

  revalidatePath("/gestor")
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  return { success: true, url: `${baseUrl}/convite/${token}` }
}

export async function listPendingInvites(known?: MembershipContext) {
  const { organizationId } = known ?? await requireGestor()
  return db.select().from(invites)
    .where(and(
      eq(invites.organizationId, organizationId),
      isNull(invites.acceptedAt),
      isNull(invites.revokedAt),
    ))
    .orderBy(desc(invites.createdAt))
}

export async function revokeInvite(id: number) {
  const { organizationId } = await requireGestor()
  await db.update(invites).set({ revokedAt: new Date() })
    .where(and(eq(invites.id, id), eq(invites.organizationId, organizationId), isNull(invites.acceptedAt)))
  revalidatePath("/gestor")
}

// Revoga todos os convites pendentes da organização de uma vez — útil se um
// link vazou e o gestor quer invalidar tudo sem revogar um por um.
export async function revokeAllPendingInvites() {
  const { organizationId } = await requireGestor()
  await db.update(invites).set({ revokedAt: new Date() })
    .where(and(eq(invites.organizationId, organizationId), isNull(invites.acceptedAt), isNull(invites.revokedAt)))
  revalidatePath("/gestor")
}

// Histórico de quem já entrou na organização via convite (provenance —
// não é a auditoria de edições, é só "quem convidou quem, e quando aceitou").
export async function listAcceptedInvites(known?: MembershipContext) {
  const { organizationId } = known ?? await requireGestor()
  return db.select({
    id: invites.id,
    email: invites.email,
    acceptedAt: invites.acceptedAt,
    acceptedByName: users.name,
  })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.acceptedByUserId))
    .where(and(eq(invites.organizationId, organizationId), isNotNull(invites.acceptedAt)))
    .orderBy(desc(invites.acceptedAt))
}

// Usado por /convite/[token] quando o visitante já está logado — exige um
// clique explícito (não aceita convite automaticamente num GET).
export async function acceptInviteForCurrentUser(token: string) {
  const user = await requireUser()
  const result = await acceptInvite(token, user.id)
  if (!result.success) return result
  redirect("/select")
}
