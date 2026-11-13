import { getActiveRoles } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { navItems } from "@/lib/nav"
import { AppNav } from "@/components/app-nav"
import { cn } from "@/lib/utils"

type ShellUser = { id: number; name: string; email: string }

/**
 * Moldura de toda tela logada: barra de navegação fixa (por papel) + <main>.
 * A página passa o usuário que já resolveu; o shell só busca os papéis.
 */
export async function AppShell({
  user, panel, className, children,
}: {
  user: ShellUser
  /** "panel2" ativa o tema azul no <main> (o <body> fica com PanelTheme). */
  panel?: string
  className?: string
  children: React.ReactNode
}) {
  const roles = await getActiveRoles(user.id)
  const items = navItems({
    isAdmin: isAdminEmail(user.email),
    hasEntregador: roles.includes("entregador"),
    hasGestor: roles.includes("gestor"),
  })

  return (
    <>
      <AppNav items={items} userName={user.name} userEmail={user.email} />
      <main
        data-panel={panel}
        // pb maior no celular: a barra inferior fixa não pode cobrir o conteúdo.
        className={cn("mx-auto min-h-screen max-w-6xl px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-10", className)}
      >
        {children}
      </main>
    </>
  )
}
