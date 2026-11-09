// "Hoje" sem UTC (D2, spec §15). toISOString() devolve a data em UTC: no
// Brasil (UTC−3), das 21:00 às 23:59 ela já é a data de amanhã.

/** Data local do navegador/processo em AAAA-MM-DD. Use no cliente. */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Data de hoje num fuso fixo, em AAAA-MM-DD. Use no servidor (a Vercel roda em UTC). */
export function todayISOIn(timeZone = "America/Sao_Paulo", d: Date = new Date()): string {
  // Monta pelas partes: o padrão de data de um locale (ex.: en-CA) vem do ICU
  // e pode mudar entre versões do Node.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get("year")}-${get("month")}-${get("day")}`
}
