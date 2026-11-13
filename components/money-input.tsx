"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { sanitizeDecimalInput } from "@/lib/money"
import { cn } from "@/lib/utils"

type BaseProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "inputMode">

/**
 * Valor em R$ com o teclado decimal do celular. Aceita "12,50" e
 * "1.234,56" e mostra com vírgula ("1234,56"); o form envia esse texto e o
 * servidor (parseMoney) troca a vírgula por ponto. `onValueChange` recebe o
 * texto com ponto. Controlado (`value`) ou não (`defaultValue`).
 */
export function MoneyInput({
  value, defaultValue, onValueChange, className, ...props
}: BaseProps & { value?: string; defaultValue?: string; onValueChange?: (clean: string) => void }) {
  const [inner, setInner] = useState(() => sanitizeDecimalInput(defaultValue ?? ""))
  const current = value ?? inner
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn("font-mono tabular-nums", className)}
      value={current.replace(".", ",")}
      onChange={(e) => {
        const clean = sanitizeDecimalInput(e.target.value)
        if (value === undefined) setInner(clean)
        onValueChange?.(clean)
      }}
    />
  )
}

/** Inteiro ≥ 0 com o teclado numérico do celular. */
export function CountInput({
  value, defaultValue, onValueChange, className, ...props
}: BaseProps & { value?: string; defaultValue?: string; onValueChange?: (digits: string) => void }) {
  const [inner, setInner] = useState(() => (defaultValue ?? "").replace(/\D/g, ""))
  const current = value ?? inner
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      className={cn("font-mono tabular-nums", className)}
      value={current}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 6)
        if (value === undefined) setInner(digits)
        onValueChange?.(digits)
      }}
    />
  )
}
