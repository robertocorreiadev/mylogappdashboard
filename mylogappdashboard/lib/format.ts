export function formatCurrency(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(isNaN(n) ? 0 : n)
}

export function formatDate(value: string | Date | null) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value + "T00:00:00") : value
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
}

export const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_transito", label: "Em trânsito" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelada", label: "Cancelada" },
] as const

export function statusLabel(value: string) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value
}
