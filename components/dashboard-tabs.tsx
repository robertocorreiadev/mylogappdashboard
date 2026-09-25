"use client"

import { useState } from "react"
import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliveriesPanel } from "@/components/deliveries-panel"
import { FinancePanel } from "@/components/finance-panel"
import { OverviewPanel } from "@/components/overview-panel"
import { DailyRecordsPanel } from "@/components/daily-records-panel"
import { StatsOverview } from "@/components/stats-overview"
import { MONTHS, filterByPeriod } from "@/lib/format"

function periodLabelFor(prefix: string, year: number | null, month: number | null): string | undefined {
  if (year === null && month === null) return undefined
  if (year !== null && month !== null) return `${prefix} — ${MONTHS[month]}/${year}`
  if (year !== null) return `${prefix} — ${year}`
  return `${prefix} — ${MONTHS[month as number]} (todos os anos)`
}

// Overrides de ação — usado pelo modo ADMIN MASTER para reaproveitar a MESMA
// UI do entregador escrevendo em nome de um alvo de qualquer organização,
// em vez de duplicar componentes (ver app/actions/admin-override.ts).
export type PanelActions = {
  onSaveDailyRecord?: Parameters<typeof DailyRecordsPanel>[0]["onSave"]
  onDeleteDailyRecord?: Parameters<typeof DailyRecordsPanel>[0]["onDelete"]
  onCreateDelivery?: Parameters<typeof DeliveriesPanel>[0]["onCreate"]
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
  const [activeTab, setActiveTab]       = useState("daily")
  const [dailyYear, setDailyYear]       = useState<number | null>(null)
  const [dailyMonth, setDailyMonth]     = useState<number | null>(null)
  const [financeYear, setFinanceYear]   = useState<number | null>(null)
  const [financeMonth, setFinanceMonth] = useState<number | null>(null)

  // Os KPIs superiores acompanham o filtro de período (ano/mês) da aba ativa no momento.
  const kpiDailyRecords = activeTab === "daily"   ? filterByPeriod(dailyRecords, dailyYear, dailyMonth)     : dailyRecords
  const kpiTransactions = activeTab === "finance" ? filterByPeriod(transactions, financeYear, financeMonth) : transactions

  const periodLabel =
    activeTab === "daily"   ? periodLabelFor("Boleta Diária", dailyYear, dailyMonth)
    : activeTab === "finance" ? periodLabelFor("Financeiro", financeYear, financeMonth)
    : undefined

  return (
    <>
      <StatsOverview
        deliveries={deliveries}
        transactions={kpiTransactions}
        dailyRecords={kpiDailyRecords}
        periodLabel={periodLabel}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Boleta Diária</TabsTrigger>
          <TabsTrigger value="deliveries">Rastreio</TabsTrigger>
          <TabsTrigger value="finance">Financeiro</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <DailyRecordsPanel
            records={dailyRecords}
            panel={panel}
            year={dailyYear}
            month={dailyMonth}
            onYearChange={setDailyYear}
            onMonthChange={setDailyMonth}
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
            {...(actions?.onUpdateDeliveryStatus ? { onUpdateStatus: actions.onUpdateDeliveryStatus } : {})}
            {...(actions?.onDeleteDelivery ? { onDelete: actions.onDeleteDelivery } : {})}
          />
        </TabsContent>
        <TabsContent value="finance">
          <FinancePanel
            transactions={transactions}
            panel={panel}
            year={financeYear}
            month={financeMonth}
            onYearChange={setFinanceYear}
            onMonthChange={setFinanceMonth}
            readOnly={readOnly}
            {...(actions?.onCreateTransaction ? { onCreate: actions.onCreateTransaction } : {})}
            {...(actions?.onUpdateTransaction ? { onUpdate: actions.onUpdateTransaction } : {})}
            {...(actions?.onDeleteTransaction ? { onDelete: actions.onDeleteTransaction } : {})}
          />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewPanel deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />
        </TabsContent>
      </Tabs>
    </>
  )
}
