import { redirect } from "next/navigation"
import { Package } from "lucide-react"
import { getSession } from "@/lib/session"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const uid = await getSession()
  if (uid) redirect("/dashboard")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-10 shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" />
          <span>JADLOG</span>
        </div>
        <h1 className="mb-6 text-center text-base text-muted-foreground">Painel de Controle</h1>
        <LoginForm />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Não tem conta?{" "}
          <a href="/register" className="font-semibold text-primary hover:underline">Cadastre-se</a>
        </p>
      </div>
    </main>
  )
}
