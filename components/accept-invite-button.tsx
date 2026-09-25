"use client"

import { useState, useTransition } from "react"
import { UserCheck } from "lucide-react"
import { acceptInviteForCurrentUser } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await acceptInviteForCurrentUser(token)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button disabled={pending} onClick={handleClick} className="gap-2">
        <UserCheck className="h-4 w-4" />
        {pending ? "Aceitando..." : "Aceitar convite"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
