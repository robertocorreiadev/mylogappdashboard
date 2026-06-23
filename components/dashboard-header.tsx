import { Package, LogOut } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"

export function DashboardHeader({ profileName }: { profileName: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-primary">JADLOG</p>
          <p className="text-xs text-muted-foreground">Painel de Controle</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Painel</p>
          <p className="text-sm font-semibold text-foreground">MYLOG</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  )
}
