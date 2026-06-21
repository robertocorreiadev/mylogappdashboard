"use client"

import type { Delivery, Transaction } from "@/lib/db/schema"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeliveriesPanel } from "@/components/deliveries-panel"
import { FinancePanel } from "@/components/finance-panel"
import { OverviewPanel } from "@/components/overview-panel"

export function DashboardTabs({
  deliveries,
  transactions,
}: {
  deliveries: Delivery[]
  transactions: Transaction[]
}) {
  return (
    <Tabs defaultValue="deliveries" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="deliveries">Entregas</TabsTrigger>
        <TabsTrigger value="finance">Financeiro</TabsTrigger>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
      </TabsList>

      <TabsContent value="deliveries">
        <DeliveriesPanel deliveries={deliveries} />
      </TabsContent>
      <TabsContent value="finance">
        <FinancePanel transactions={transactions} />
      </TabsContent>
      <TabsContent value="overview">
        <OverviewPanel deliveries={deliveries} transactions={transactions} />
      </TabsContent>
    </Tabs>
  )
}
