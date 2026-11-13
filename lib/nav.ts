// Navegação fixa do app (barra superior no desktop, barra inferior no
// celular). Função pura: quem decide os papéis é o servidor (AppShell).

export type NavContext = { isAdmin: boolean; hasEntregador: boolean; hasGestor: boolean }

export type NavIcon = "jadlog" | "panel2" | "gestor" | "auditoria" | "gestao"

export type NavItem = {
  href: string
  label: string
  /** Rótulo da barra inferior do celular (até 9 letras). */
  shortLabel: string
  icon: NavIcon
}

export function navItems({ isAdmin, hasEntregador, hasGestor }: NavContext): NavItem[] {
  const items: NavItem[] = []
  if (hasEntregador) {
    items.push({ href: "/dashboard", label: "JADLOG", shortLabel: "JADLOG", icon: "jadlog" })
    items.push({ href: "/panel2", label: "Painel 2", shortLabel: "Painel 2", icon: "panel2" })
  }
  if (hasGestor) items.push({ href: "/gestor", label: "Gestor", shortLabel: "Gestor", icon: "gestor" })
  // O admin vê a auditoria de todas as organizações, mesmo sem ser gestor (D10).
  if (hasGestor || isAdmin) items.push({ href: "/gestor/auditoria", label: "Auditoria", shortLabel: "Auditoria", icon: "auditoria" })
  if (isAdmin) items.push({ href: "/gestao", label: "Gestão", shortLabel: "Gestão", icon: "gestao" })
  return items
}

/** O item `/gestor` cobre o drill-down (`/gestor/entregadores/...`), não a auditoria. */
export function isNavActive(href: string, pathname: string): boolean {
  if (pathname === href) return true
  if (href === "/gestor") return pathname.startsWith("/gestor/entregadores/")
  return false
}

/** "Voltar" do drill-down: o gestor volta ao /gestor; o admin, à tela de origem. */
export function drillDownBackHref(mode: "gestor" | "admin", from: string | undefined): string {
  if (mode === "gestor") return "/gestor"
  return from === "gestor" ? "/gestor" : "/gestao"
}
