import Link from "next/link"
import { SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-2xl sm:p-10">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h1 className="mb-2 text-lg font-semibold text-foreground">Página não encontrada</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          O endereço não existe ou você não tem acesso a ele.
        </p>
        <Link href="/select" className={buttonVariants()}>Voltar ao início</Link>
      </div>
    </main>
  )
}
