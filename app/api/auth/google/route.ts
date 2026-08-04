import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const state = crypto.randomBytes(16).toString("hex")

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/google/callback`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "openid email profile")
  authUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authUrl.toString())
  // Cookie de curta duração usado só para validar o retorno do Google (proteção CSRF).
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  })
  return response
}
