import { NextRequest, NextResponse } from "next/server"
import { loginWithGoogle } from "@/lib/google-auth"

const STATE_COOKIE = "google_oauth_state"
const INVITE_COOKIE = "pending_invite_token"

// Toda saída do callback apaga o state (uso único) e o convite pendente.
function finish(url: string) {
  const response = NextResponse.redirect(url)
  response.cookies.delete(STATE_COOKIE)
  response.cookies.delete(INVITE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const expectedState = request.cookies.get(STATE_COOKIE)?.value

  if (!code) {
    return finish(`${baseUrl}/?error=google_cancelled`)
  }

  // Protege contra CSRF no fluxo OAuth: o state devolvido pelo Google precisa
  // bater com o que geramos antes de redirecionar o usuário.
  if (!state || !expectedState || state !== expectedState) {
    return finish(`${baseUrl}/?error=google_invalid_state`)
  }

  const inviteToken = request.cookies.get(INVITE_COOKIE)?.value ?? null

  try {
    // Troca code por access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenRes.json()

    // Busca dados do perfil Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const profile = await profileRes.json()

    if (typeof profile?.id !== "string" || typeof profile?.email !== "string") {
      throw new Error("perfil do Google sem id ou e-mail")
    }

    // loginWithGoogle faz o upsert do usuário e seta o cookie de sessão
    // (não chama redirect() aqui dentro — isso quebraria o try/catch, já que
    // redirect() funciona lançando uma exceção especial).
    // D1: ela só liga ou cria conta pelo e-mail se ele for autoritativo
    // (verified_email + @gmail.com ou Workspace) — regras em lib/google-link.ts.
    const result = await loginWithGoogle(profile, inviteToken)
    if (result.error) return finish(`${baseUrl}/?error=${result.error}`)
  } catch (err) {
    console.error("Google OAuth error:", err)
    return finish(`${baseUrl}/?error=google_failed`)
  }

  return finish(`${baseUrl}/select`)
}

