import { NextRequest, NextResponse } from "next/server"
import { loginWithGoogle } from "@/app/actions/auth"

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL!
  const code = request.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.redirect(`${base}/?error=cancelado`)

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${base}/api/auth/google/callback`,
        grant_type:    "authorization_code",
      }),
    })
    const token = await tokenRes.json()
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const profile = await profileRes.json()
    await loginWithGoogle(profile.id, profile.email, profile.name, profile.picture)
  } catch (e) {
    console.error("Google OAuth error:", e)
    return NextResponse.redirect(`${base}/?error=google_falhou`)
  }
  return NextResponse.redirect(`${base}/dashboard`)
}
