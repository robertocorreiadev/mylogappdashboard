/**
 * Regras de ligação de conta no login Google (D1, spec §15). Funções puras,
 * sem banco, para serem testadas sozinhas.
 *
 * Por que "autoritativo" e não só `verified_email`: o Google diz que o e-mail
 * só prova a posse quando é @gmail.com ou quando a conta é Workspace (`hd`
 * presente). Uma conta Google comum pode ter verificado alice@empresa.com no
 * passado e não ter mais acesso a essa caixa.
 */

/** Campos do userinfo v2 do Google usados aqui (valores não confiáveis). */
export type GoogleEmailClaims = { email: string; verified_email?: unknown; hd?: unknown }

export function isEmailAuthoritative(p: GoogleEmailClaims): boolean {
  if (p.verified_email !== true) return false
  const email = p.email.trim().toLowerCase()
  if (email.endsWith("@gmail.com")) return true
  const domain = email.slice(email.lastIndexOf("@") + 1)
  return typeof p.hd === "string" && p.hd !== "" && p.hd.toLowerCase() === domain
}

export type GoogleLinkDecision =
  | { action: "use"; userId: number }
  | { action: "link"; userId: number }
  | { action: "create" }
  | { action: "reject"; reason: "google_unverified" | "google_conflict" }

/**
 * - Conta já ligada a este google_id → usa essa conta.
 * - Senão, o e-mail só vale se for autoritativo; sem isso, recusa ligar
 *   (entraria na conta de outra pessoa) e recusa criar (pré-sequestro: a conta
 *   ficaria com o e-mail de outra pessoa antes dela).
 * - Conta do e-mail já ligada a OUTRO google_id → recusa (conflito).
 */
export function decideGoogleLink(
  googleId: string,
  byGoogleId: { id: number } | null,
  byEmail: { id: number; googleId: string | null } | null,
  emailAuthoritative: boolean,
): GoogleLinkDecision {
  if (byGoogleId) return { action: "use", userId: byGoogleId.id }
  if (!emailAuthoritative) return { action: "reject", reason: "google_unverified" }
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== googleId) return { action: "reject", reason: "google_conflict" }
    return { action: "link", userId: byEmail.id }
  }
  return { action: "create" }
}
