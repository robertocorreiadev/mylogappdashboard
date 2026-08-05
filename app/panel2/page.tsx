import { redirect } from "next/navigation"
import { requireUser } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { getDeliveries } from "@/app/actions/deliveries"
import { getTransactions } from "@/app/actions/transactions"
import { getDailyRecords } from "@/app/actions/daily-records"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardTabs } from "@/components/dashboard-tabs"

const PANEL = "panel2" as const

export default async function Panel2Page() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect("/")
  }

  const [deliveries, transactions, dailyRecords] = await Promise.all([
    getDeliveries(PANEL),
    getTransactions(PANEL),
    getDailyRecords(PANEL),
  ])

  return (
    <main
      className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8"
      data-panel={PANEL}
    >
      <DashboardHeader
        userName={user.name}
        userEmail={user.email}
        panelName="Painel 2"
        panel={PANEL}
        isAdmin={isAdminEmail(user.email)}
      />
      <DashboardTabs
        deliveries={deliveries}
        transactions={transactions}
        dailyRecords={dailyRecords}
        panel={PANEL}
      />
    </main>
  )
}
