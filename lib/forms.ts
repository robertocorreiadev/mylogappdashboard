// Validação dos formulários no servidor (D3 e D12, spec §15). Funções puras:
// as actions normais e as do modo admin usam as mesmas, e devolvem { error }
// em vez de lançar exceção ou deixar o Postgres responder com erro 500.
import { PANEL_LABELS, STATUS_OPTIONS } from "@/lib/format"

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

/** Resultado de toda action de escrita (D12): a UI mostra `error` no form. */
export type ActionResult = { error?: string; success?: boolean }

const MAX_MONEY = 100_000_000 // numeric(10,2) guarda até 99.999.999,99
const MAX_COUNT = 100_000
const MAX_TEXT = 200
const MAX_LONG_TEXT = 500

function field(fd: FormData, name: string): string {
  return fd.get(name)?.toString() ?? ""
}

/** Valor em R$ ≥ 0 com até 2 casas. Aceita "12,50", ".5" e "3." (o input
 *  number e o Postgres aceitam). Vazio → "0". Devolve normalizado ("0.5", "3"). */
export function parseMoney(raw: string, label: string): Parsed<string> {
  const s = raw.trim().replace(",", ".")
  if (s === "") return { ok: true, value: "0" }
  const m = /^(\d*)(?:\.(\d{0,2}))?$/.exec(s)
  if (!m || (m[1] === "" && !m[2]) || Number(s) >= MAX_MONEY) {
    return { ok: false, error: `${label}: informe um valor de 0 a 99.999.999,99, com até 2 casas decimais.` }
  }
  const int = m[1] === "" ? "0" : m[1]
  return { ok: true, value: m[2] ? `${int}.${m[2]}` : int }
}

/** Quantidade inteira ≥ 0. Vazio → 0. */
export function parseCount(raw: string, label: string): Parsed<number> {
  const s = raw.trim()
  if (s === "") return { ok: true, value: 0 }
  if (!/^\d+$/.test(s) || Number(s) > MAX_COUNT) {
    return { ok: false, error: `${label}: informe um número inteiro de 0 a ${MAX_COUNT.toLocaleString("pt-BR")}.` }
  }
  return { ok: true, value: Number(s) }
}

/** Data AAAA-MM-DD que existe no calendário. */
export function parseISODate(raw: string, label: string): Parsed<string> {
  const s = raw.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const dt = new Date(Date.UTC(y, mo - 1, d))
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return { ok: true, value: s }
  }
  return { ok: false, error: `${label}: data inválida.` }
}

function parsePanel(raw: string): Parsed<string> {
  const p = raw || "jadlog"
  // hasOwn, não `in`: `in` aceita chaves herdadas ("constructor", "__proto__").
  return Object.hasOwn(PANEL_LABELS, p) ? { ok: true, value: p } : { ok: false, error: "Painel inválido." }
}

/** Status de entrega da lista fixa (create e update de status). */
export function isDeliveryStatus(s: string): boolean {
  return STATUS_OPTIONS.some((o) => o.value === s)
}

/** Id de registro vindo do form (edição): inteiro positivo. */
export function parseRecordId(raw: string): Parsed<number> {
  const s = raw.trim()
  return /^\d+$/.test(s) && Number(s) > 0 ? { ok: true, value: Number(s) } : { ok: false, error: "Lançamento inválido." }
}

function text(raw: string, label: string, max = MAX_TEXT): Parsed<string> {
  const s = raw.trim()
  return s.length <= max ? { ok: true, value: s } : { ok: false, error: `${label}: no máximo ${max} caracteres.` }
}

/** Valor de um resultado já conferido por firstError. */
const v = <T,>(r: Parsed<T>) => (r as { ok: true; value: T }).value

/** Primeiro erro de uma lista de resultados, ou null. */
function firstError(...rs: Parsed<unknown>[]): string | null {
  for (const r of rs) if (!r.ok) return r.error
  return null
}

export type DailyRecordInput = {
  panel: string; date: string; valuePerDelivery: string
  delivered: number; scheduled: number; occurrences: number; expenses: string
}

export function parseDailyRecordForm(fd: FormData): Parsed<DailyRecordInput> {
  if (!field(fd, "date").trim()) return { ok: false, error: "Selecione uma data." }
  const panel = parsePanel(field(fd, "panel"))
  const date = parseISODate(field(fd, "date"), "Data")
  const vpdRaw = field(fd, "valuePerDelivery")
  const valuePerDelivery = parseMoney(vpdRaw.trim() === "" ? "3.50" : vpdRaw, "Valor por entrega")
  const delivered = parseCount(field(fd, "delivered"), "Entregas realizadas")
  const scheduled = parseCount(field(fd, "scheduled"), "Agendadas sem sucesso")
  const occurrences = parseCount(field(fd, "occurrences"), "Com ocorrência")
  const expenses = parseMoney(field(fd, "expenses"), "Despesas do dia")
  const err = firstError(panel, date, valuePerDelivery, delivered, scheduled, occurrences, expenses)
  if (err) return { ok: false, error: err }
  return {
    ok: true,
    value: {
      panel: v(panel), date: v(date), valuePerDelivery: v(valuePerDelivery),
      delivered: v(delivered), scheduled: v(scheduled), occurrences: v(occurrences), expenses: v(expenses),
    },
  }
}

export type DeliveryInput = {
  panel: string; trackingCode: string; recipient: string; address: string | null
  city: string | null; status: string; value: string; deadline: string | null
}

export function parseDeliveryForm(fd: FormData): Parsed<DeliveryInput> {
  const trackingCode = text(field(fd, "trackingCode"), "Código de rastreio")
  const recipient = text(field(fd, "recipient"), "Destinatário")
  if (trackingCode.ok && recipient.ok && (!trackingCode.value || !recipient.value)) {
    return { ok: false, error: "Código de rastreio e destinatário são obrigatórios." }
  }
  const panel = parsePanel(field(fd, "panel"))
  const address = text(field(fd, "address"), "Endereço", MAX_LONG_TEXT)
  const city = text(field(fd, "city"), "Cidade")
  const statusRaw = field(fd, "status") || "pendente"
  const status: Parsed<string> = isDeliveryStatus(statusRaw)
    ? { ok: true, value: statusRaw } : { ok: false, error: "Status inválido." }
  const value = parseMoney(field(fd, "value"), "Valor")
  const deadlineRaw = field(fd, "deadline").trim()
  const deadline: Parsed<string | null> = deadlineRaw ? parseISODate(deadlineRaw, "Prazo") : { ok: true, value: null }
  const err = firstError(trackingCode, recipient, panel, address, city, status, value, deadline)
  if (err) return { ok: false, error: err }
  return {
    ok: true,
    value: {
      panel: v(panel), trackingCode: v(trackingCode), recipient: v(recipient),
      address: v(address) || null, city: v(city) || null, status: v(status), value: v(value), deadline: v(deadline),
    },
  }
}

export type TransactionInput = {
  panel: string; type: string; description: string
  category: string | null; amount: string; date: string
}

/** `today` vem de quem chama (no servidor: todayISOIn("America/Sao_Paulo"), D2).
 *  O id da edição é lido à parte, com parseRecordId. */
export function parseTransactionForm(fd: FormData, today: string): Parsed<TransactionInput> {
  const description = text(field(fd, "description"), "Descrição", MAX_LONG_TEXT)
  if (description.ok && !description.value) return { ok: false, error: "Descrição obrigatória." }
  const panel = parsePanel(field(fd, "panel"))
  const typeRaw = field(fd, "type") || "receita"
  const type: Parsed<string> = typeRaw === "receita" || typeRaw === "despesa"
    ? { ok: true, value: typeRaw } : { ok: false, error: "Tipo inválido." }
  const category = text(field(fd, "category"), "Categoria")
  const amount = parseMoney(field(fd, "amount"), "Valor")
  const dateRaw = field(fd, "date").trim()
  const date = dateRaw ? parseISODate(dateRaw, "Data") : { ok: true as const, value: today }
  const err = firstError(description, panel, type, category, amount, date)
  if (err) return { ok: false, error: err }
  return {
    ok: true,
    value: {
      panel: v(panel), type: v(type), description: v(description),
      category: v(category) || null, amount: v(amount), date: v(date),
    },
  }
}
