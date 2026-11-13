// Texto da tela de auditoria (funções puras).
import { formatCurrency, formatDate, statusLabel } from "@/lib/format"

type AuditRef = { entityType: string; entityId: number; snapshotBefore: unknown; snapshotAfter: unknown }

function snapshotField(ref: AuditRef, key: string): string | null {
  for (const snap of [ref.snapshotAfter, ref.snapshotBefore]) {
    if (snap && typeof snap === "object" && key in snap) {
      const v = (snap as Record<string, unknown>)[key]
      if (v !== null && v !== undefined && String(v) !== "") return String(v)
    }
  }
  return null
}

const ENTITY_NOUN: Record<string, string> = {
  daily_record: "boleta",
  delivery: "pacote",
  transaction: "lançamento",
  audit_log_entry: "entrada de auditoria",
  user: "usuário",
}

/** Nome do item no histórico: "boleta de 12/11/2026", "pacote JL1BR", 'lançamento "X"'. */
export function auditItemLabel(ref: AuditRef): string {
  const noun = ENTITY_NOUN[ref.entityType] ?? ref.entityType
  const fallback = `${noun} #${ref.entityId}`
  switch (ref.entityType) {
    case "daily_record": {
      const d = snapshotField(ref, "date")
      return d ? `boleta de ${formatDate(d)}` : fallback
    }
    case "delivery": {
      const c = snapshotField(ref, "trackingCode")
      return c ? `pacote ${c}` : fallback
    }
    case "transaction": {
      const t = snapshotField(ref, "description")
      return t ? `lançamento "${t}"` : fallback
    }
    case "user": {
      const n = snapshotField(ref, "name")
      return n ? `usuário ${n}` : fallback
    }
    default:
      return fallback
  }
}

// Plural de cada tipo, para o filtro da auditoria.
const ENTITY_PLURAL: Record<string, string> = {
  daily_record: "Boletas",
  delivery: "Pacotes",
  transaction: "Lançamentos",
  user: "Usuários",
  audit_log_entry: "Entradas de auditoria",
}

export function auditEntityPlural(entityType: string): string {
  return ENTITY_PLURAL[entityType] ?? entityType
}

const FIELD_LABELS: Record<string, string> = {
  delivered: "entregas realizadas", scheduled: "agendadas", occurrences: "ocorrências",
  valuePerDelivery: "valor por entrega", expenses: "despesas", status: "status",
  value: "valor", amount: "valor", type: "tipo", description: "descrição", category: "categoria",
  date: "data", deadline: "prazo", recipient: "destinatário", address: "endereço", city: "cidade",
  trackingCode: "código de rastreio",
}

/** Nome do campo na lista de mudanças ("valor por entrega"). */
export function auditFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

const MONEY_FIELDS = new Set(["valuePerDelivery", "expenses", "value", "amount"])
const DATE_FIELDS = new Set(["date", "deadline"])

/** Valor antigo/novo de um campo, como o usuário lê na tela. */
export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (MONEY_FIELDS.has(field)) return formatCurrency(Number(value))
  if (DATE_FIELDS.has(field)) return formatDate(String(value))
  if (field === "status") return statusLabel(String(value))
  if (field === "type") return value === "receita" ? "Receita" : value === "despesa" ? "Despesa" : String(value)
  return String(value)
}

const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
})

/**
 * "13/11/2026 09:05" no fuso de São Paulo. Fuso fixo, não o da máquina: o
 * componente renderiza no servidor (UTC na Vercel) e no navegador, e os dois
 * textos precisam ser iguais (senão o React acusa erro de hidratação).
 */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return DATE_TIME.format(date).replace(",", "")
}
