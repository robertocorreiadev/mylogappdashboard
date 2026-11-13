"use client"

import { useMemo, useState } from "react"
import { ClipboardList, Package, Wallet, BarChart3 } from "lucide-react"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliveriesPanel } from "@/components/deliveries-panel"
import { FinancePanel } from "@/components/finance-panel"
import { OverviewPanel } from "@/components/overview-panel"
import { DailyRecordsPanel } from "@/components/daily-records-panel"
import { StatsOverview } from "@/components/stats-overview"
import { PeriodFilter } from "@/components/period-filter"
import { filterByPeriod } from "@/lib/format"

// Overrides de ação — usado pelo modo ADMIN MASTER para reaproveitar a MESMA
// UI do entregador escrevendo em nome de um alvo de qualquer organização,
// em vez de duplicar componentes (ver app/actions/admin-override.ts).
export type PanelActions = {
  onSaveDailyRecord?: Parameters<typeof DailyRecordsPanel>[0]["onSave"]
  onDeleteDailyRecord?: Parameters<typeof DailyRecordsPanel>[0]["onDelete"]
  onCreateDelivery?: Parameters<typeof DeliveriesPanel>[0]["onCreate"]
  onUpdateDelivery?: Parameters<typeof DeliveriesPanel>[0]["onUpdate"]
  onUpdateDeliveryStatus?: Parameters<typeof DeliveriesPanel>[0]["onUpdateStatus"]
  onDeleteDelivery?: Parameters<typeof DeliveriesPanel>[0]["onDelete"]
  onCreateTransaction?: Parameters<typeof FinancePanel>[0]["onCreate"]
  onUpdateTransaction?: Parameters<typeof FinancePanel>[0]["onUpdate"]
  onDeleteTransaction?: Parameters<typeof FinancePanel>[0]["onDelete"]
}

export function DashboardTabs({
  deliveries, transactions, dailyRecords, panel = "jadlog", readOnly = false, actions,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
  panel?: string
  readOnly?: boolean
  actions?: PanelActions
}) {
  const [activeTab, setActiveTab] = useState("daily")
  // Um filtro só para a página: cartões do topo, Boletas, Financeiro e Visão
  // geral. O Rastreio não é filtrado (pacote não tem data de boleta).
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)

  const periodItems = useMemo(() => [...dailyRecords, ...transactions], [dailyRecords, transactions])
  const records = useMemo(() => filterByPeriod(dailyRecords, year, month), [dailyRecords, year, month])
  const txs = useMemo(() => filterByPeriod(transactions, year, month), [transactions, year, month])

  return (
    <>
      <div className="mb-3">
        <PeriodFilter
          items={periodItems}
          year={year}
          month={month}
          onChange={(y, m) => { setYear(y); setMonth(m) }}
        />
      </div>
      <StatsOverview
        deliveries={deliveries}
        transactions={txs}
        dailyRecords={records}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-fit [scrollbar-width:none]">
          <TabsTrigger value="daily" className="flex-none gap-1.5 px-3"><ClipboardList aria-hidden="true" />Boletas</TabsTrigger>
          <TabsTrigger value="deliveries" className="flex-none gap-1.5 px-3"><Package aria-hidden="true" />Rastreio</TabsTrigger>
          <TabsTrigger value="finance" className="flex-none gap-1.5 px-3"><Wallet aria-hidden="true" />Financeiro</TabsTrigger>
          <TabsTrigger value="overview" className="flex-none gap-1.5 px-3"><BarChart3 aria-hidden="true" />Visão geral</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <DailyRecordsPanel
            records={records}
            allRecords={dailyRecords}
            filtered={year !== null || month !== null}
            showAnnual={month === null}
            panel={panel}
            readOnly={readOnly}
            {...(actions?.onSaveDailyRecord ? { onSave: actions.onSaveDailyRecord } : {})}
            {...(actions?.onDeleteDailyRecord ? { onDelete: actions.onDeleteDailyRecord } : {})}
          />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesPanel
            deliveries={deliveries}
            panel={panel}
            readOnly={readOnly}
            {...(actions?.onCreateDelivery ? { onCreate: actions.onCreateDelivery } : {})}
            {...(actions?.onUpdateDelivery ? { onUpdate: actions.onUpdateDelivery } : {})}
            {...(actions?.onUpdateDeliveryStatus ? { onUpdateStatus: actions.onUpdateDeliveryStatus } : {})}
            {...(actions?.onDeleteDelivery ? { onDelete: actions.onDeleteDelivery } : {})}
          />
        </TabsContent>
        <TabsContent value="finance">
          <FinancePanel
            transactions={txs}
            hasAny={transactions.length > 0}
            panel={panel}
            readOnly={readOnly}
            {...(actions?.onCreateTransaction ? { onCreate: actions.onCreateTransaction } : {})}
            {...(actions?.onUpdateTransaction ? { onUpdate: actions.onUpdateTransaction } : {})}
            {...(actions?.onDeleteTransaction ? { onDelete: actions.onDeleteTransaction } : {})}
          />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewPanel deliveries={deliveries} transactions={txs} dailyRecords={records} />
        </TabsContent>
      </Tabs>
    </>
  )
}
