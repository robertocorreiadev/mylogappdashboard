import { NextRequest, NextResponse } from "next/server"
import { loginWithGoogle } from "@/app/actions/auth"

const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const expectedState = request.cookies.get(STATE_COOKIE)?.value

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=google_cancelled`)
  }

  // Protege contra CSRF no fluxo OAuth: o state devolvido pelo Google precisa
  // bater com o que geramos antes de redirecionar o usuário.
  if (!state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(`${baseUrl}/?error=google_invalid_state`)
    response.cookies.delete(STATE_COOKIE)
    return response
  }

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

    // loginWithGoogle faz upsert e redireciona para /dashboard
    await loginWithGoogle(profile.id, profile.email, profile.name, profile.picture)
  } catch (err) {
    console.error("Google OAuth error:", err)
    return NextResponse.redirect(`${baseUrl}/?error=google_failed`)
  }

  // loginWithGoogle já faz redirect — este ponto não é alcançado em sucesso
  return NextResponse.redirect(`${baseUrl}/dashboard`)
}

