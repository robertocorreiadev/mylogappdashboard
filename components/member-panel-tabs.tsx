"use client"

import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsOverview } from "@/components/stats-overview"
import { DashboardTabs, type PanelActions } from "@/components/dashboard-tabs"

type PanelData = {
  panel: string
  label: string
  dailyRecords: DailyRecord[]
  deliveries: Delivery[]
  transactions: Transaction[]
}

// Um painel = um contrato/transportadora distinto do entregador — nunca
// mescla os números de painéis diferentes num total só, para o gestor ver
// exatamente onde a performance aconteceu.
// `actions` presente = modo ADMIN MASTER (escrita habilitada com overrides
// admin-only); ausente = drill-down normal do gestor (sempre readOnly).
export function MemberPanelTabs({ panels, actions }: { panels: PanelData[]; actions?: PanelActions }) {
  return (
    <Tabs defaultValue={panels[0]?.panel ?? "jadlog"}>
      <TabsList className="mb-4">
        {panels.map((p) => (
          <TabsTrigger key={p.panel} value={p.panel}>{p.label}</TabsTrigger>
        ))}
      </TabsList>
      {panels.map((p) => (
        <TabsContent key={p.panel} value={p.panel}>
          <StatsOverview deliveries={p.deliveries} transactions={p.transactions} dailyRecords={p.dailyRecords} />
          <DashboardTabs
            deliveries={p.deliveries}
            transactions={p.transactions}
            dailyRecords={p.dailyRecords}
            panel={p.panel}
            readOnly={!actions}
            actions={actions}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
