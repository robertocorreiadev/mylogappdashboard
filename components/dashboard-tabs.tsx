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

export function DashboardTabs({
  deliveries, transactions, dailyRecords, panel = "jadlog",
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
  panel?: string
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
          />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesPanel deliveries={deliveries} panel={panel} />
        </TabsContent>
        <TabsContent value="finance">
          <FinancePanel
            transactions={transactions}
            panel={panel}
            year={financeYear}
            month={financeMonth}
            onYearChange={setFinanceYear}
            onMonthChange={setFinanceMonth}
          />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewPanel deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />
        </TabsContent>
      </Tabs>
    </>
  )
}
