import { redirect } from "next/navigation"
import { requireUser } from "@/app/actions/auth"
import { getDeliveries } from "@/app/actions/deliveries"
import { getTransactions } from "@/app/actions/transactions"
import { getDailyRecords } from "@/app/actions/daily-records"
import { PanelTheme } from "@/components/panel-theme"
import { AppShell } from "@/components/app-shell"
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

  // Ver comentário equivalente em app/dashboard/page.tsx.
  let deliveries, transactions, dailyRecords
  try {
    ;[deliveries, transactions, dailyRecords] = await Promise.all([
      getDeliveries(PANEL),
      getTransactions(PANEL),
      getDailyRecords(PANEL),
    ])
  } catch {
    redirect("/select")
  }

  return (
    <AppShell user={user} panel={PANEL}>
      <PanelTheme panel={PANEL} />
      <DashboardHeader title="Painel 2" subtitle="Boletas, rastreio e financeiro de outros contratos" />
      <DashboardTabs
        deliveries={deliveries}
        transactions={transactions}
        dailyRecords={dailyRecords}
        panel={PANEL}
      />
    </AppShell>
  )
}
