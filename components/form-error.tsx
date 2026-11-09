// Caixa de erro dos formulários (D12): mostra o { error } que a action devolveu.
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}
