import { redirect } from "next/navigation"
import { getUserId } from "@/lib/session"
import { Package, LayoutDashboard } from "lucide-react"

export default async function SelectPage() {
  const userId = await getUserId()
  if (!userId) redirect("/")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" />
          <span>MYLOG</span>
        </div>
        <h1 className="mb-2 text-center text-xl font-bold text-foreground">Selecione o Painel</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Escolha qual transportadora deseja gerenciar
        </p>

        <div className="flex flex-col gap-4">
          {/* Botão JADLOG — tema âmbar atual */}
          <a
            href="/dashboard"
            className="group flex items-center gap-5 rounded-xl border-2 border-primary/40 bg-card p-6 shadow-lg transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">Painel JADLOG</p>
              <p className="text-sm text-muted-foreground">Entregas e financeiro Jadlog</p>
            </div>
            <span className="ml-auto text-xl text-primary opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </a>

          {/* Botão Painel 2 — tema azul */}
          <a
            href="/panel2"
            className="group flex items-center gap-5 rounded-xl border-2 border-[#4f9dff]/40 bg-card p-6 shadow-lg transition-all hover:border-[#4f9dff] hover:bg-[#4f9dff]/5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#4f9dff] text-white shadow">
              <LayoutDashboard className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#4f9dff]">Painel 2</p>
              <p className="text-sm text-muted-foreground">Entregas e financeiro para outros contratos</p>
            </div>
            <span className="ml-auto text-xl text-[#4f9dff] opacity-0 transition-opacity group-hover:opacity-100">→</span>
          </a>
        </div>
      </div>
    </main>
  )
}
