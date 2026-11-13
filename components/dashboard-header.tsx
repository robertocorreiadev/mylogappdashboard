import Link from "next/link"
import { ArrowLeft, ShieldAlert, Eye } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

// Cabeçalho de contexto da página: título, subtítulo e, no drill-down, a
// faixa de modo (gestor só leitura / ADMIN MASTER). Navegação, conta, tema e
// sair ficam na barra fixa (components/app-nav.tsx).
export function DashboardHeader({
  title, subtitle, viewerMode, actions,
}: {
  title: string
  subtitle?: string
  /**
   * Gestor vendo um entregador (só leitura) ou ADMIN MASTER (mode "admin",
   * escrita habilitada, faixa vermelha). Ver app/actions/admin-override.ts.
   */
  viewerMode?: { entregadorName: string; mode?: "gestor" | "admin"; backHref: string }
  /** Ações da página (ex.: "Nova organização"), à direita do título. */
  actions?: React.ReactNode
}) {
  const isAdminMode = viewerMode?.mode === "admin"

  return (
    <>
      {viewerMode && (
        <div
          role="status"
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 ${
            isAdminMode ? "border-destructive/50 bg-destructive/10" : "border-[var(--role-gestor)]/40 bg-[var(--role-gestor)]/10"
          }`}
        >
          <p className="flex items-center gap-2 text-sm text-foreground">
            {isAdminMode ? (
              <><ShieldAlert className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /> Modo ADMIN MASTER — editando <strong>{viewerMode.entregadorName}</strong></>
            ) : (
              <><Eye className="h-4 w-4 shrink-0 text-[var(--role-gestor)]" aria-hidden="true" /> Visualizando como gestor: <strong>{viewerMode.entregadorName}</strong> · somente leitura</>
            )}
          </p>
          <Link href={viewerMode.backHref} className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
          </Link>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight text-primary md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </>
  )
}
