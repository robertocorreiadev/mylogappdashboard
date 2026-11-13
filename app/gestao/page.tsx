import { redirect } from "next/navigation"
import { requireAdmin } from "@/app/actions/auth"
import { getAllUsers } from "@/app/actions/admin-users"
import { AppShell } from "@/components/app-shell"
import { DashboardHeader } from "@/components/dashboard-header"
import { UsersPanel } from "@/components/users-panel"
import { CreateOrganizationPanel } from "@/components/create-organization-panel"

export default async function UsuariosPage() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect("/select")
  }

  const allUsers = await getAllUsers()

  return (
    <AppShell user={admin}>
      <DashboardHeader
        title="Gestão de Usuários"
        subtitle="Usuários e organizações de todo o sistema"
        actions={<CreateOrganizationPanel users={allUsers} />}
      />
      <UsersPanel users={allUsers} currentUserId={admin.id} />
    </AppShell>
  )
}
