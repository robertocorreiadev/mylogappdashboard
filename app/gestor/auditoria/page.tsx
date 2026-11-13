import { redirect } from "next/navigation"
import { History } from "lucide-react"
import { requireUser, requireGestor } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { getAuditLog, getAuditLogGlobal } from "@/app/actions/gestor"
import { AppShell } from "@/components/app-shell"
import { DashboardHeader } from "@/components/dashboard-header"
import { AuditLogRow } from "@/components/audit-log-row"
import { Card, CardContent } from "@/components/ui/card"

export default async function AuditoriaPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect("/")
  }

  // D10: o admin master (ADMIN_EMAIL) vê a auditoria de TODAS as organizações,
  // mesmo sem ser gestor de nenhuma. O gestor vê só a da própria organização.
  const isAdmin = isAdminEmail(user.email)
  let logs: Awaited<ReturnType<typeof getAuditLogGlobal>> | Awaited<ReturnType<typeof getAuditLog>>
  if (isAdmin) {
    logs = await getAuditLogGlobal()
  } else {
    let ctx
    try {
      ctx = await requireGestor(user)
    } catch {
      redirect("/select")
    }
    logs = await getAuditLog(ctx)
  }
  const canDelete = isAdmin

  return (
    <AppShell user={user}>
      <DashboardHeader
        title="Auditoria"
        subtitle={isAdmin ? "Edições de todas as organizações" : "Edições feitas na sua organização"}
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Histórico de edições ({logs.length}){isAdmin && " · todas as organizações"}
            </h2>
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma edição registrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} canDelete={canDelete} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
