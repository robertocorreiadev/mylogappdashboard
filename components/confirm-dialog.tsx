"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"

type ButtonProps = React.ComponentProps<typeof Button>

type ConfirmProps = {
  title: string
  description?: string
  confirmLabel?: string
  pendingLabel?: string
  onConfirm: () => Promise<unknown> | unknown
  /** Depois do sucesso (ex.: toast). */
  onDone?: () => void
}

/**
 * Modal de confirmação para ações que não voltam (excluir, revogar). Não usa
 * `window.confirm` (trava a página e não segue o tema). Se a action devolver
 * `{ error }` ou lançar, o erro aparece no modal e ele não fecha. Foco
 * inicial em "Cancelar". Controlado: quem abre é o chamador (ex.: um menu).
 */
export function ConfirmDialog({
  open, onOpenChange, title, description = "Essa ação não pode ser desfeita.",
  confirmLabel = "Excluir", pendingLabel = "Excluindo...", onConfirm, onDone,
}: ConfirmProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Fechado = sem erro: ao abrir de novo, o erro da tentativa anterior não aparece.
  if (!open && error) setError(null)

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
        onOpenChange(false)
        onDone?.()
      } catch {
        setError("Não foi possível concluir. Atualize a página e tente de novo.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) { setError(null); onOpenChange(o) } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)} autoFocus>Cancelar</Button>
          <Button variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Botão que abre o ConfirmDialog. */
export function ConfirmButton({
  buttonProps, children, ...confirm
}: ConfirmProps & { buttonProps?: ButtonProps; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ConfirmDialog {...confirm} open={open} onOpenChange={setOpen} />
    </>
  )
}
