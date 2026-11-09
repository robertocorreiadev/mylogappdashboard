// Login Google no servidor. Fica FORA de um arquivo "use server" de propósito:
// esta função confia no perfil que recebe, então não pode virar uma Server
// Action (endpoint POST público). Só a rota /api/auth/google/callback a chama,
// com o perfil que ela mesma buscou no Google com o access_token.
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { setUserId } from "@/lib/session"
import { createSoloOrgForNewUser } from "@/lib/db/onboarding"
import { acceptInvite } from "@/lib/invites"
import { decideGoogleLink, isEmailAuthoritative, type GoogleEmailClaims } from "@/lib/google-link"

export type GoogleProfile = GoogleEmailClaims & { id: string; name?: string | null; picture?: string | null }

export async function loginWithGoogle(
  profile: GoogleProfile,
  inviteToken?: string | null,
): Promise<{ error?: "google_unverified" | "google_conflict" }> {
  const email = profile.email.trim().toLowerCase()

  const [byGoogle] = await db.select().from(users).where(eq(users.googleId, profile.id)).limit(1)
  // Só consulta pelo e-mail se o google_id não resolveu (caso comum: usuário que volta).
  const [byEmail] = byGoogle ? [] : await db.select().from(users).where(eq(users.email, email)).limit(1)

  const decision = decideGoogleLink(profile.id, byGoogle ?? null, byEmail ?? null, isEmailAuthoritative(profile))

  switch (decision.action) {
    case "reject":
      return { error: decision.reason }

    case "use":
    case "link": {
      const existing = (byGoogle ?? byEmail)!
      await db.update(users).set({
        googleId:  existing.googleId  ?? profile.id,
        name:      existing.name      ?? (profile.name ?? undefined),
        avatarUrl: existing.avatarUrl ?? (profile.picture ?? undefined),
      }).where(eq(users.id, decision.userId))
      await setUserId(decision.userId)
      if (inviteToken) await acceptInvite(inviteToken, decision.userId)
      return {}
    }

    case "create": {
      const [created] = await db.insert(users).values({
        name: profile.name ?? email.split("@")[0], email, googleId: profile.id, avatarUrl: profile.picture ?? undefined,
      }).returning()
      const joinedViaInvite = inviteToken ? (await acceptInvite(inviteToken, created.id)).success : false
      if (!joinedViaInvite) await createSoloOrgForNewUser(created.id, created.name)
      await setUserId(created.id)
      return {}
    }
  }
}
