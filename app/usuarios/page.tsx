import { redirect } from "next/navigation"
import { requireAdmin } from "@/app/actions/auth"
import { getAllUsers } from "@/app/actions/admin-users"
import { DashboardHeader } from "@/components/dashboard-header"
import { UsersPanel } from "@/components/users-panel"

export default async function UsuariosPage() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect("/select")
  }

  const allUsers = await getAllUsers()

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader
        userName={admin.name}
        userEmail={admin.email}
        panelName="Gestão de Usuários"
      />
      <UsersPanel users={allUsers} currentUserId={admin.id} />
    </main>
  )
}
