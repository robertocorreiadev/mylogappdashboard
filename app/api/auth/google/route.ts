import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const STATE_COOKIE = "google_oauth_state"
const INVITE_COOKIE = "pending_invite_token"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const state = crypto.randomBytes(16).toString("hex")
  // /convite/[token] manda o token do convite por aqui (?invite=) — o state
  // do OAuth não serve pra isso, é só anti-CSRF.
  const inviteToken = request.nextUrl.searchParams.get("invite")

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
  if (inviteToken) {
    response.cookies.set(INVITE_COOKIE, inviteToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 10,
    })
  }
  return response
}
