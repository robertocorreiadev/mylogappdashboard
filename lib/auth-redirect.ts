/**
 * Destino depois de sair da conta. Só aceita a página de um convite
 * (`/convite/{token}`, token base64url — lib/invites.ts): é o "Trocar conta"
 * da tela de convite. Qualquer outro valor vai para o login, para o campo
 * nunca virar um redirecionamento aberto.
 */
export function safeLogoutRedirect(next: string | null | undefined): string {
  if (next && /^\/convite\/[A-Za-z0-9_-]+$/.test(next)) return next
  return "/"
}
