"use client"

import { THEME_COOKIE, themeColor, type Theme } from "@/lib/theme"

/**
 * Troca o tema na hora (no <html>) e grava o cookie. Quem chama (menu de
 * conta, components/app-nav.tsx) também chama a action `setTheme`.
 */
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor(next))
  // Grava o cookie já no clique: se o usuário navegar antes de a action
  // terminar, a navegação cancela a action e a escolha se perderia (visto
  // no smoke test de 2026-11-13). A action continua para o layout (Toaster)
  // receber o tema novo.
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}
