import { redirect } from "next/navigation"
import { requireUser } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { getDeliveries } from "@/app/actions/deliveries"
import { getTransactions } from "@/app/actions/transactions"
import { getDailyRecords } from "@/app/actions/daily-records"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardTabs } from "@/components/dashboard-tabs"

const PANEL = "jadlog" as const

export default async function DashboardPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect("/")
  }

  // getDeliveries/getTransactions/getDailyRecords exigem requireEntregador()
  // — uma conta só-gestor (sem membership de entregador) cairia aqui com um
  // erro não tratado em vez do redirect gracioso; /select decide pra onde
  // essa conta deve ir de verdade (ex.: /gestor).
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader
        userName={user.name}
        userEmail={user.email}
        panelName="JADLOG"
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
