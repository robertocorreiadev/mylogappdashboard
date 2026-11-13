"use client"

import { useState } from "react"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { DashboardTabs, type PanelActions } from "@/components/dashboard-tabs"
import { PanelTheme } from "@/components/panel-theme"
import { cn } from "@/lib/utils"

type PanelData = {
  panel: string
  label: string
  dailyRecords: DailyRecord[]
  deliveries: Delivery[]
  transactions: Transaction[]
}

const PANEL_COLOR: Record<string, string> = { jadlog: "var(--panel-jadlog)", panel2: "var(--panel-2)" }

// Um painel = um contrato/transportadora distinto do entregador — nunca
// mescla os números de painéis diferentes num total só.
// Seletor de painel (botões), não abas dentro de abas: as abas de baixo são
// as do painel (Boletas, Rastreio...). O Painel 2 pinta a área de azul.
// `actions` presente = modo ADMIN MASTER (escrita habilitada com overrides
// admin-only); ausente = drill-down normal do gestor (sempre readOnly).
export function MemberPanelTabs({ panels, actions }: { panels: PanelData[]; actions?: PanelActions }) {
  const [active, setActive] = useState(panels[0]?.panel ?? "jadlog")
  const current = panels.find((p) => p.panel === active) ?? panels[0]
  if (!current) return null

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Painel">
        <span className="text-sm text-muted-foreground">Painel</span>
        {panels.map((p) => {
          const on = p.panel === current.panel
          const color = PANEL_COLOR[p.panel] ?? "var(--primary)"
          return (
            <button
              key={p.panel}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(p.panel)}
              className={cn(
                "rounded-full border-2 px-4 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:py-2",
                on ? "text-white" : "border-border text-muted-foreground hover:bg-muted",
              )}
              style={on ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      {/* key: trocar de painel zera o filtro e a aba (cada painel é outro contrato). */}
      {/* Modais e menus abrem no <body>: o PanelTheme leva o azul até eles. */}
      {current.panel === "panel2" && <PanelTheme panel="panel2" />}
      <div data-panel={current.panel === "panel2" ? "panel2" : undefined}>
        <DashboardTabs
          key={current.panel}
          deliveries={current.deliveries}
          transactions={current.transactions}
          dailyRecords={current.dailyRecords}
          panel={current.panel}
          readOnly={!actions}
          actions={actions}
        />
      </div>
    </>
  )
}
