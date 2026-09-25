// Lógica de convite compartilhada entre app/actions/auth.ts (aceite durante
// login/registro/OAuth) e app/actions/invites.ts (geração/revogação pelo
// gestor). Fica fora de app/actions/* para evitar import circular entre
// esses dois arquivos "use server".
import crypto from "crypto"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { invites, memberships, organizations, users } from "@/lib/db/schema"

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url")
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export type InviteLookup =
  | { valid: true; organizationId: number; orgName: string; email: string | null }
  | { valid: false; reason: "not_found" | "expired" | "revoked" | "accepted" }

export async function getInviteByToken(token: string): Promise<InviteLookup> {
  const tokenHash = hashInviteToken(token)
  const [row] = await db.select({
    organizationId: invites.organizationId,
    expiresAt: invites.expiresAt,
    acceptedAt: invites.acceptedAt,
    revokedAt: invites.revokedAt,
    email: invites.email,
    orgName: organizations.name,
  })
    .from(invites)
    .innerJoin(organizations, eq(organizations.id, invites.organizationId))
    .where(eq(invites.tokenHash, tokenHash))
    .limit(1)

  if (!row) return { valid: false, reason: "not_found" }
  if (row.revokedAt) return { valid: false, reason: "revoked" }
  if (row.acceptedAt) return { valid: false, reason: "accepted" }
  if (row.expiresAt < new Date()) return { valid: false, reason: "expired" }
  return { valid: true, organizationId: row.organizationId, orgName: row.orgName, email: row.email }
}

// Transacional: reconfirma o convite (evita corrida/reuso duplo) e garante
// que o usuário não tem outra membership 'entregador' ativa antes de criar
// a nova — nunca duas 'entregador' ativas ao mesmo tempo (ver dual-role em
// migrate-multitenant-001-schema.sql).
export async function acceptInvite(token: string, userId: number): Promise<{ success: boolean; error?: string }> {
  const tokenHash = hashInviteToken(token)

  return db.transaction(async (tx) => {
    const [invite] = await tx.select().from(invites).where(eq(invites.tokenHash, tokenHash)).limit(1)
    if (!invite) return { success: false, error: "Convite inválido." }
    if (invite.revokedAt) return { success: false, error: "Este convite foi revogado." }
    if (invite.acceptedAt) return { success: false, error: "Este convite já foi utilizado." }
    if (invite.expiresAt < new Date()) return { success: false, error: "Este convite expirou." }

    if (invite.email) {
      const [accepting] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
      if (!accepting || accepting.email.toLowerCase() !== invite.email.toLowerCase()) {
        return { success: false, error: `Este convite é exclusivo para ${invite.email}.` }
      }
    }

    const [existingEntregador] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.userId, userId),
        eq(memberships.role, "entregador"),
        eq(memberships.status, "active"),
      ))
      .limit(1)
    if (existingEntregador) {
      return { success: false, error: "Sua conta já pertence a outra organização como entregador." }
    }

    await tx.insert(memberships).values({
      organizationId: invite.organizationId,
      userId,
      role: "entregador",
      invitedByUserId: invite.createdByUserId,
    })
    await tx.update(invites)
      .set({ acceptedAt: new Date(), acceptedByUserId: userId })
      .where(eq(invites.id, invite.id))

    return { success: true }
  })
}
