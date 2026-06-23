import { redirect } from "next/navigation"
import { getProfile, PROFILES } from "@/lib/session"
import { getDeliveries } from "@/app/actions/deliveries"
import { getTransactions } from "@/app/actions/transactions"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsOverview } from "@/components/stats-overview"
import { DashboardTabs } from "@/components/dashboard-tabs"

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect("/")

  const [deliveries, transactions] = await Promise.all([getDeliveries(), getTransactions()])
  const profileName = PROFILES[profile].name

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader profileName={profileName} />
      <StatsOverview deliveries={deliveries} transactions={transactions} />
      <DashboardTabs deliveries={deliveries} transactions={transactions} />
    </main>
  )
}
