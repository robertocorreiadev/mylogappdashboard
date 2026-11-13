// Números da tela do gestor. Regra do projeto: os painéis NUNCA são somados
// nas telas do gestor (cada painel é um contrato diferente).
import { PANEL_LABELS } from "@/lib/format"
import { recordNet } from "@/lib/metrics"

type Rec = { userId: number; panel: string; date: string; delivered: number; valuePerDelivery: string | number; expenses: string | number }

export type PanelNumbers = { delivered: number; net: number }
export type MemberStats = { byPanel: Record<string, PanelNumbers>; lastDate: string | null }

/** Por entregador: entregas e líquido de cada painel + data da boleta mais recente. */
export function memberStats(records: Rec[]): Map<number, MemberStats> {
  const out = new Map<number, MemberStats>()
  for (const r of records) {
    const m = out.get(r.userId) ?? { byPanel: {}, lastDate: null }
    const p = m.byPanel[r.panel] ?? { delivered: 0, net: 0 }
    p.delivered += r.delivered
    p.net += recordNet({ delivered: r.delivered, valuePerDelivery: String(r.valuePerDelivery), expenses: String(r.expenses) })
    m.byPanel[r.panel] = p
    if (!m.lastDate || r.date > m.lastDate) m.lastDate = r.date
    out.set(r.userId, m)
  }
  return out
}

/** Um resumo por painel (os padrões sempre aparecem, mesmo sem dado). */
export function panelSummaries(records: Rec[]): ({ panel: string } & PanelNumbers)[] {
  const keys = Array.from(new Set([...Object.keys(PANEL_LABELS), ...records.map((r) => r.panel)]))
  return keys.map((panel) => {
    const rs = records.filter((r) => r.panel === panel)
    return {
      panel,
      delivered: rs.reduce((s, r) => s + r.delivered, 0),
      net: rs.reduce((s, r) => s + recordNet({ delivered: r.delivered, valuePerDelivery: String(r.valuePerDelivery), expenses: String(r.expenses) }), 0),
    }
  })
}
