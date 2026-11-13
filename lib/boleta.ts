// Regras de tela da boleta diária (funções puras).

type VpdInput = { date: string; valuePerDelivery: string | number }

/** Valor por entrega da boleta mais recente (2 casas), para vir preenchido. */
export function lastValuePerDelivery(records: VpdInput[]): string {
  let latest: VpdInput | null = null
  for (const r of records) if (!latest || r.date > latest.date) latest = r
  return latest ? Number(latest.valuePerDelivery).toFixed(2) : "3.50"
}

export type DeliveredFilter = "all" | "with" | "without"

/** "with" = dias com entregas; "without" = boleta registrada com 0 entregas. */
export function filterByDelivered<T extends { delivered: number }>(records: T[], filter: DeliveredFilter): T[] {
  if (filter === "with") return records.filter((r) => r.delivered > 0)
  if (filter === "without") return records.filter((r) => r.delivered === 0)
  return records
}
