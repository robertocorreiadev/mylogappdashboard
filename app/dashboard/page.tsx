import { redirect } from "next/navigation"
import { requireUser } from "@/app/actions/auth"
import { getDeliveries } from "@/app/actions/deliveries"
import { getTransactions } from "@/app/actions/transactions"
import { getDailyRecords } from "@/app/actions/daily-records"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsOverview } from "@/components/stats-overview"
import { DashboardTabs } from "@/components/dashboard-tabs"

export default async function DashboardPage() {
  let user
  try { user = await requireUser() } catch { redirect("/") }

  const [deliveries, transactions, dailyRecords] = await Promise.all([
    getDeliveries(),
    getTransactions(),
    getDailyRecords(),
  ])

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader userName={user.name} />
      <StatsOverview deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />
      <DashboardTabs deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />
    </main>
  )
}
