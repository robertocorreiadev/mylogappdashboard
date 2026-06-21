import { redirect } from "next/navigation"
import { Package, User, Database } from "lucide-react"
import { getProfile, PROFILES } from "@/lib/session"
import { selectProfile } from "@/app/actions/auth"

export default async function LoginPage() {
  const profile = await getProfile()
  if (profile) redirect("/dashboard")

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-10 shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" aria-hidden="true" />
          <span>JADLOG</span>
        </div>
        <h1 className="mb-8 text-center text-lg text-muted-foreground">Painel de Controle</h1>

        <div className="mb-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Selecione seu acesso:
          </p>
          <div className="flex flex-col gap-2">
            {Object.values(PROFILES).map((p) => (
              <form key={p.id} action={selectProfile}>
                <input type="hidden" name="profile" value={p.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
                >
                  <User className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
                  <span>{p.name}</span>
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-md border-l-[3px] border-primary bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Seus dados são salvos automaticamente na nuvem e sincronizados em tempo real.</span>
        </div>
      </div>
    </main>
  )
}
