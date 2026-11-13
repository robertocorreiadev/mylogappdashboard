"use client"

import { useTransition } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setTheme } from "@/app/actions/theme"
import { THEME_COOKIE, themeColor, type Theme } from "@/lib/theme"

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

/** Troca o tema na hora (no <html>) e grava o cookie no servidor. */
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor(next))
  // Grava o cookie já no clique: se o usuário navegar antes de a action
  // terminar, a navegação cancela a action e a escolha se perderia (visto
  // no smoke test de 2026-11-13). A action continua para o layout (Toaster)
  // receber o tema novo.
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function ThemeToggle({ className }: { className?: string }) {
  const [, startTransition] = useTransition()

  function toggle() {
    const next: Theme = currentTheme() === "light" ? "dark" : "light"
    applyTheme(next)
    startTransition(async () => {
      await setTheme(next)
    })
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} className={className} aria-label="Trocar tema claro/escuro" title="Trocar tema claro/escuro">
      <Sun className="hidden h-4 w-4 [:root[data-theme=light]_&]:block" />
      <Moon className="h-4 w-4 [:root[data-theme=light]_&]:hidden" />
    </Button>
  )
}
