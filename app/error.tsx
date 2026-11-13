"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-2xl sm:p-10">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="mb-2 text-lg font-semibold text-foreground">Algo deu errado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Não foi possível carregar esta tela. Tente de novo. Se o erro continuar, volte ao início.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()}>Tentar de novo</Button>
          <Link href="/select" className={buttonVariants({ variant: "outline" })}>Voltar ao início</Link>
        </div>
      </div>
    </main>
  )
}
