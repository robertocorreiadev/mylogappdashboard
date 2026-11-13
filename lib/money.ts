// Campo de valor em R$ digitado no celular (teclado pt-BR): o usuário digita
// "12,50" ou "1.234,56". O texto limpo usa ponto como decimal, que é o que o
// servidor (parseMoney, lib/forms.ts) e o Postgres esperam.

/**
 * Limpa o que foi digitado: só dígitos e um separador decimal ("."), no
 * máximo 2 casas. Com "." e "," juntos, o "." é milhar e a "," é o decimal.
 * Com um tipo só, o primeiro separador é o decimal e os outros saem.
 */
export function sanitizeDecimalInput(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, "")
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "")
  s = s.replace(/,/g, ".")
  const i = s.indexOf(".")
  if (i === -1) return s
  const decimals = s.slice(i + 1).replace(/\./g, "").slice(0, 2)
  return `${s.slice(0, i)}.${decimals}`
}

/** Número do texto já limpo; vazio ou só o separador → 0. */
export function decimalValue(clean: string): number {
  const n = Number(clean)
  return Number.isFinite(n) ? n : 0
}
