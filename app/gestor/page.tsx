import { redirect } from "next/navigation"
import { requireGestor } from "@/app/actions/auth"
import { getOrgOverview } from "@/app/actions/gestor"
import { listPendingInvites, listAcceptedInvites } from "@/app/actions/invites"
import { AppShell } from "@/components/app-shell"
import { DashboardHeader } from "@/components/dashboard-header"
import { GestorOverview } from "@/components/gestor-overview"
import { InvitesPanel } from "@/components/invites-panel"

export default async function GestorPage() {
  let ctx
  try {
    ctx = await requireGestor()
  } catch {
    redirect("/select")
  }

  const [{ dailyRecords, deliveries, transactions, members }, pendingInvites, acceptedInvites] = await Promise.all([
    getOrgOverview(ctx),
    listPendingInvites(ctx),
    listAcceptedInvites(ctx),
  ])

  // Os números (por painel, por entregador, no período) são calculados no
  // cliente (GestorOverview), que tem o filtro de período e o seletor de painel.
  return (
    <AppShell user={ctx.user}>
      <DashboardHeader title="Painel do Gestor" subtitle="Visão da sua organização" />
      <GestorOverview dailyRecords={dailyRecords} deliveries={deliveries} transactions={transactions} members={members} />
      <InvitesPanel invites={pendingInvites} acceptedInvites={acceptedInvites} />
    </AppShell>
  )
}
