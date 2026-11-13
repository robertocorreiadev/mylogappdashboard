"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Package, LayoutDashboard, Users, History, ShieldCheck, Settings, LogOut, Moon, Sun, ChevronDown,
} from "lucide-react"
import { logout } from "@/app/actions/auth"
import { setTheme } from "@/app/actions/theme"
import { applyTheme } from "@/components/theme-toggle"
import { AccountSettingsDialog } from "@/components/account-settings-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isNavActive, type NavIcon, type NavItem } from "@/lib/nav"
import { cn } from "@/lib/utils"

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  jadlog: Package,
  panel2: LayoutDashboard,
  gestor: Users,
  auditoria: History,
  gestao: ShieldCheck,
}

// Cor de identidade de cada item ativo (tokens de globals.css). Os outros
// itens usam a cor de marca.
const ACTIVE_COLOR: Partial<Record<NavIcon, string>> = {
  jadlog: "var(--panel-jadlog)",
  panel2: "var(--panel-2)",
  gestor: "var(--role-gestor)",
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

function AccountMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, startTransition] = useTransition()

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"
    applyTheme(next)
    startTransition(async () => { await setTheme(next) })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:py-1.5"
          aria-label={`Conta de ${userName}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(userName)}
          </span>
          <span className="hidden max-w-40 truncate font-medium text-foreground lg:inline">{userName}</span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block text-sm font-semibold text-foreground">{userName}</span>
              <span className="block truncate">{userEmail}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings /> Configurações da conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} closeOnClick={false}>
            <Sun className="hidden [:root[data-theme=light]_&]:block" />
            <Moon className="[:root[data-theme=light]_&]:hidden" />
            <span className="[:root[data-theme=light]_&]:hidden">Tema claro</span>
            <span className="hidden [:root[data-theme=light]_&]:inline">Tema escuro</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => startTransition(async () => { await logout() })}>
            <LogOut /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} userName={userName} userEmail={userEmail} />
    </>
  )
}

/**
 * Barra fixa do app: no desktop, uma barra superior com os itens; no
 * celular, a barra superior fica só com logo e conta, e os itens vão para
 * uma barra inferior fixa (alcance do polegar).
 */
export function AppNav({ items, userName, userEmail }: { items: NavItem[]; userName: string; userEmail: string }) {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link href="/select" className="flex items-center gap-2 rounded-lg font-bold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="MYLOG — início">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base tracking-tight">MYLOG</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden flex-1 md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => {
                const Icon = ICONS[item.icon]
                const active = isNavActive(item.href, pathname)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                        active && "bg-muted text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" style={active ? { color: ACTIVE_COLOR[item.icon] ?? "var(--primary)" } : undefined} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto">
            <AccountMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </header>

      {items.length > 0 && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto flex max-w-md items-stretch justify-around">
            {items.map((item) => {
              const Icon = ICONS[item.icon]
              const active = isNavActive(item.href, pathname)
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-muted",
                      active && "text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" style={active ? { color: ACTIVE_COLOR[item.icon] ?? "var(--primary)" } : undefined} />
                    {item.shortLabel}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </>
  )
}
