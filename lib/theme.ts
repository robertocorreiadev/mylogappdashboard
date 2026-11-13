// Tema da interface (escuro é o padrão). A preferência fica no cookie
// `theme`; o layout raiz lê o cookie e escreve `data-theme` no <html> no
// servidor, então a página já chega com o tema certo (sem piscar).

export type Theme = "dark" | "light"

export const THEME_COOKIE = "theme"

export function parseTheme(value: string | undefined): Theme {
  return value === "light" ? "light" : "dark"
}

/** Cor da barra do navegador no celular = fundo do tema (`--background`). */
export function themeColor(theme: Theme): string {
  return theme === "light" ? "#f4f5f8" : "#0f1117"
}
