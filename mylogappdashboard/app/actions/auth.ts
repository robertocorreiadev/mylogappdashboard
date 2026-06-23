"use server"

import { redirect } from "next/navigation"
import { setProfile, clearProfile, isValidProfile } from "@/lib/session"

export async function selectProfile(formData: FormData) {
  const profile = formData.get("profile")?.toString()
  if (!isValidProfile(profile)) {
    throw new Error("Perfil inválido")
  }
  await setProfile(profile)
  redirect("/dashboard")
}

export async function logout() {
  await clearProfile()
  redirect("/")
}
