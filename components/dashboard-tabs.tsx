"use client"

import type { Delivery, Transaction, DailyRecord } from "@/lib/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliveriesPanel } from "@/components/deliveries-panel"
import { FinancePanel } from "@/components/finance-panel"
import { OverviewPanel } from "@/components/overview-panel"
import { DailyRecordsPanel } from "@/components/daily-records-panel"

export function DashboardTabs({
  deliveries, transactions, dailyRecords, panel = "jadlog",
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
  dailyRecords: DailyRecord[]
  panel?: string
}) {
  return (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="daily">Boleta Diária</TabsTrigger>
        <TabsTrigger value="deliveries">Rastreio</TabsTrigger>
        <TabsTrigger value="finance">Financeiro</TabsTrigger>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <DailyRecordsPanel records={dailyRecords} panel={panel} />
      </TabsContent>
      <TabsContent value="deliveries">
        <DeliveriesPanel deliveries={deliveries} panel={panel} />
      </TabsContent>
      <TabsContent value="finance">
        <FinancePanel transactions={transactions} panel={panel} />
      </TabsContent>
      <TabsContent value="overview">
        <OverviewPanel deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />
      </TabsContent>
    </Tabs>
  )
}
