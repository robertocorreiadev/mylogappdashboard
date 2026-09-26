import { redirect } from "next/navigation"
import { Users, History } from "lucide-react"
import { requireGestor } from "@/app/actions/auth"
import { getOrgOverview } from "@/app/actions/gestor"
import { listPendingInvites, listAcceptedInvites } from "@/app/actions/invites"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsOverview } from "@/components/stats-overview"
import { InvitesPanel } from "@/components/invites-panel"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, panelLabel, PANEL_LABELS } from "@/lib/format"

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

  // Resumo por entregador — agregado em memória a partir dos dados já
  // buscados (organização pequena; não justifica GROUP BY no banco ainda).
  const byUser = new Map<number, { delivered: number; net: number }>()
  for (const r of dailyRecords) {
    const cur = byUser.get(r.userId) ?? { delivered: 0, net: 0 }
    const gross = r.delivered * Number(r.valuePerDelivery)
    cur.delivered += r.delivered
    cur.net += gross - Number(r.expenses)
    byUser.set(r.userId, cur)
  }

  // Composição por painel — nunca mescla os painéis num total só, para o
  // gestor ver onde (em qual contrato/transportadora) a operação performou.
  const byPanel = new Map<string, { delivered: number; gross: number; expenses: number }>()
  for (const key of Object.keys(PANEL_LABELS)) byPanel.set(key, { delivered: 0, gross: 0, expenses: 0 })
  for (const r of dailyRecords) {
    const cur = byPanel.get(r.panel) ?? { delivered: 0, gross: 0, expenses: 0 }
    cur.delivered += r.delivered
    cur.gross += r.delivered * Number(r.valuePerDelivery)
    cur.expenses += Number(r.expenses)
    byPanel.set(r.panel, cur)
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader userName={ctx.user.name} userEmail={ctx.user.email} panelName="Painel do Gestor" />

      <div className="mb-4 flex justify-end">
        <a href="/gestor/auditoria" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <History className="h-4 w-4" /> Histórico de edições dos entregadores
        </a>
      </div>

      <StatsOverview deliveries={deliveries} transactions={transactions} dailyRecords={dailyRecords} />

      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Composição por painel</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from(byPanel.entries()).map(([panel, stats]) => {
              const net = stats.gross - stats.expenses
              return (
                <div key={panel} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">{panelLabel(panel)}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stats.delivered} entregas</span>
                    <span className={`font-mono font-semibold ${net >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
                      {formatCurrency(net)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <InvitesPanel invites={pendingInvites} acceptedInvites={acceptedInvites} />
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Entregadores ({members.length})</h2>

          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Nenhum entregador nesta organização ainda</p>
              <p className="text-xs text-muted-foreground">
                Use &quot;Convidar entregador&quot; acima para gerar um link de convite.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => {
                const stats = byUser.get(m.userId)
                const net = stats?.net ?? 0
                return (
                  <a
                    key={m.userId}
                    href={`/gestor/entregadores/${m.userId}`}
                    className="rounded-lg border border-border p-4 transition-colors hover:border-primary/50 hover:bg-secondary/40"
                  >
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stats?.delivered ?? 0} entregas</span>
                      <span className={`font-mono font-semibold ${net >= 0 ? "text-[var(--chart-2)]" : "text-destructive"}`}>
                        {formatCurrency(net)}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
