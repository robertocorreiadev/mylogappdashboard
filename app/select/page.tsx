import Link from "next/link"
import { redirect } from "next/navigation"
import { Package, LayoutDashboard, Users, ShieldCheck, ArrowRight, Inbox, LogOut } from "lucide-react"
import { getActiveRoles, logout, requireUser } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

type Choice = {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  /** Token de identidade (globals.css). */
  color: string
}

export default async function SelectPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect("/")
  }

  const roles = await getActiveRoles(user.id)
  const hasGestor = roles.includes("gestor")
  const hasEntregador = roles.includes("entregador")
  const isAdmin = isAdminEmail(user.email)

  // Conta só-gestor (sem papel de entregador e sem ser admin): a única tela
  // dela é o /gestor.
  if (hasGestor && !hasEntregador && !isAdmin) redirect("/gestor")

  const choices: Choice[] = []
  if (hasEntregador) {
    choices.push({ href: "/dashboard", title: "Painel JADLOG", description: "Boletas, rastreio e financeiro do contrato Jadlog", icon: Package, color: "var(--panel-jadlog)" })
    choices.push({ href: "/panel2", title: "Painel 2", description: "Boletas, rastreio e financeiro de outros contratos", icon: LayoutDashboard, color: "var(--panel-2)" })
  }
  if (hasGestor) {
    choices.push({ href: "/gestor", title: "Painel do Gestor", description: "Entregadores, convites e resultados da sua organização", icon: Users, color: "var(--role-gestor)" })
  }
  if (isAdmin) {
    choices.push({ href: "/gestao", title: "Gestão", description: "Usuários e organizações de todo o sistema", icon: ShieldCheck, color: "var(--destructive)" })
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name

  return (
    <AppShell user={user} className="max-w-xl">
      <h1 className="text-xl font-bold text-foreground md:text-2xl">Olá, {firstName}</h1>

      {choices.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold text-foreground">Você ainda não faz parte de uma operação</p>
          <p className="text-sm text-muted-foreground">
            Peça ao seu gestor um link de convite. Ao abrir o link com esta conta, o acesso aparece aqui.
          </p>
          <form action={logout} className="mt-2">
            <Button type="submit" variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
            </Button>
          </form>
        </div>
      ) : (
        <>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Escolha onde trabalhar</p>
          <ul className="flex flex-col gap-3">
            {choices.map(({ href, title, description, icon: Icon, color }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-4 rounded-xl border-2 bg-card p-4 shadow-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
                  style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold" style={{ color }}>{title}</span>
                    <span className="block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color }} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  )
}
