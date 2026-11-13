/** Host sem o sufixo de pool do Neon: "ep-x-pooler.region..." e "ep-x.region..." são o mesmo endpoint. */
function endpointOf(hostname: string): string {
  const [first, ...rest] = hostname.toLowerCase().split(".")
  return [first.replace(/-pooler$/, ""), ...rest].join(".")
}

/**
 * O seed de pior caso só roda num banco de TESTE, nunca no endpoint do
 * DATABASE_URL (produção):
 * - destino vazio, URL inválida ou não-Postgres → recusa;
 * - sem DATABASE_URL para comparar → recusa (falta de referência não libera);
 * - mesmo endpoint (com ou sem "-pooler", qualquer banco, senha ou
 *   parâmetro) → recusa. Um branch do Neon tem outro endpoint: permitido.
 */
export function seedTargetAllowed(seedUrl: string | undefined, databaseUrl: string | undefined): boolean {
  if (!seedUrl || !databaseUrl) return false
  let target: URL
  let prod: URL
  try {
    target = new URL(seedUrl)
    prod = new URL(databaseUrl)
  } catch {
    return false
  }
  if (!/^postgres(ql)?:$/.test(target.protocol) || !target.hostname) return false
  return endpointOf(target.hostname) !== endpointOf(prod.hostname)
}
