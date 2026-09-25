import { redirect } from "next/navigation"
import { History } from "lucide-react"
import { requireUser, requireGestor } from "@/app/actions/auth"
import { isAdminEmail } from "@/lib/auth"
import { getAuditLog } from "@/app/actions/gestor"
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

  // Admin não precisa ser gestor de nenhuma org pra ver a auditoria — mas
  // getAuditLog() é sempre requireGestor()-scoped, então pra admin sem
  // membership de gestor isso ainda funcionaria só se ele também for
  // gestor de alguma org (ex.: Legado, no caso do ADMIN_EMAIL atual).
  let ctx
  try {
    ctx = await requireGestor()
  } catch {
    redirect("/select")
  }

  const logs = await getAuditLog()
  const canDelete = isAdminEmail(user.email)

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader userName={ctx.user.name} userEmail={ctx.user.email} panelName="Auditoria" />

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Histórico de edições ({logs.length})</h2>
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
    </main>
  )
}
