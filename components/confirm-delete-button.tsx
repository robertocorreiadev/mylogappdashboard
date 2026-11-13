"use client"

import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { ConfirmButton } from "@/components/confirm-dialog"

// D13: excluir pede confirmação num modal. Usado nas tabelas de boleta,
// pacote e financeiro. A lógica do modal está no ConfirmButton.
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
  return (
    <ConfirmButton
      title={`Excluir ${itemLabel}?`}
      onConfirm={onConfirm}
      onDone={() => toast.success("Excluído", { description: itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1) })}
      buttonProps={{
        variant: "ghost",
        size: "icon",
        className: className ?? "h-7 w-7 text-muted-foreground hover:text-destructive",
        disabled,
        "aria-label": `Excluir ${itemLabel}`,
      }}
    >
      <Trash2 className={iconClassName} />
    </ConfirmButton>
  )
}
