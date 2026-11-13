"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"

type ButtonProps = React.ComponentProps<typeof Button>

/**
 * Botão que pede confirmação num modal antes de uma ação que não volta
 * (excluir, revogar). Não usa `window.confirm` (trava a página e não segue o
 * tema). Se a action devolver `{ error }` ou lançar, o erro aparece no modal
 * e ele não fecha. Foco inicial em "Cancelar".
 */
export function ConfirmButton({
  title, description = "Essa ação não pode ser desfeita.", confirmLabel = "Excluir", pendingLabel = "Excluindo...",
  onConfirm, onDone, buttonProps, children,
}: {
  title: string
  description?: string
  confirmLabel?: string
  pendingLabel?: string
  onConfirm: () => Promise<unknown> | unknown
  /** Depois do sucesso (ex.: toast). */
  onDone?: () => void
  buttonProps?: ButtonProps
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await onConfirm()
        // As actions devolvem { error } em vez de lançar (D12).
        if (res && typeof res === "object" && "error" in res && typeof res.error === "string" && res.error) {
          setError(res.error)
          return
        }
        setOpen(false)
        onDone?.()
      } catch {
        setError("Não foi possível concluir. Atualize a página e tente de novo.")
      }
    })
  }

  return (
    <>
      <Button
        {...buttonProps}
        disabled={pending || buttonProps?.disabled}
        onClick={() => { setError(null); setOpen(true) }}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!pending) setOpen(o) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)} autoFocus>Cancelar</Button>
            <Button variant="destructive" disabled={pending} onClick={handleConfirm}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
