/**
 * O seed de pior caso só roda num banco DIFERENTE do DATABASE_URL (que é o de
 * produção). Compara host e nome do banco: trocar senha ou parâmetros não
 * libera. Destino vazio ou URL inválida → recusa.
 */
export function seedTargetAllowed(seedUrl: string | undefined, databaseUrl: string | undefined): boolean {
  if (!seedUrl) return false
  let target: URL
  try {
    target = new URL(seedUrl)
  } catch {
    return false
  }
  if (!/^postgres(ql)?:$/.test(target.protocol) || !target.hostname) return false
  if (!databaseUrl) return true
  try {
    const prod = new URL(databaseUrl)
    const same = target.hostname.toLowerCase() === prod.hostname.toLowerCase() && target.pathname === prod.pathname
    return !same
  } catch {
    return false
  }
}
