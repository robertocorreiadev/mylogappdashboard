import { redirect } from "next/navigation"
import { Package } from "lucide-react"
import { getSession } from "@/lib/session"
import { RegisterForm } from "@/components/register-form"

export default async function RegisterPage() {
  const userId = await getSession()
  if (userId) redirect("/dashboard")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-10 shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" aria-hidden="true" />
          <span>JADLOG</span>
        </div>
        <h1 className="mb-6 text-center text-base text-muted-foreground">Criar conta</h1>
        <RegisterForm />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <a href="/" className="font-semibold text-primary hover:underline">
            Fazer login
          </a>
        </p>
      </div>
    </main>
  )
}
