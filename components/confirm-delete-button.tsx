"use client"

import { toast } from "sonner"
import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"

// D13: excluir pede confirmação num modal (não `window.confirm`, que trava a
// página e não segue o tema). Usado nas tabelas de boleta, entrega e financeiro.
export function ConfirmDeleteButton({
  itemLabel, onConfirm, disabled = false, className, iconClassName = "h-3.5 w-3.5",
}: {
  /** Ex.: "a boleta de 09/11/2026" — entra em "Excluir {itemLabel}?". */
  itemLabel: string
  onConfirm: () => Promise<unknown> | void
  /** Ex.: outra ação da mesma linha em andamento. */
  disabled?: boolean
  className?: string
  iconClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      // Sem o catch, uma falha (sessão vencida, erro no banco) derrubaria o
      // painel inteiro na página de erro. Aqui ela aparece dentro do modal.
      try {
        const res = await onConfirm()
        // As actions devolvem { error } em vez de lançar (D12).
        if (res && typeof res === "object" && "error" in res && typeof res.error === "string" && res.error) {
          setError(res.error)
          return
        }
        setOpen(false)
        toast.success("Excluído", { description: itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1) })
      } catch {
        setError("Não foi possível excluir. Atualize a página e tente de novo.")
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost" size="icon"
        className={className ?? "h-7 w-7 text-muted-foreground hover:text-destructive"}
        disabled={pending || disabled}
        onClick={() => { setError(null); setOpen(true) }}
        aria-label={`Excluir ${itemLabel}`}
      >
        <Trash2 className={iconClassName} />
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!pending) setOpen(o) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {itemLabel}?</DialogTitle>
            <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={pending} onClick={handleConfirm}>
              {pending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
