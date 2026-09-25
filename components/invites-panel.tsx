"use client"

import { useState, useTransition } from "react"
import { Mail, Copy, X, Check, ShieldOff } from "lucide-react"
import { createInvite, revokeInvite, revokeAllPendingInvites } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/format"

type Invite = { id: number; email: string | null; expiresAt: Date; createdAt: Date }
type AcceptedInvite = { id: number; email: string | null; acceptedAt: Date | null; acceptedByName: string }

function NewInviteDialog({ onCreated }: { onCreated: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(fd: FormData) {
    fd.set("expiresInDays", expiresInDays)
    startTransition(async () => {
      const res = await createInvite(fd)
      onCreated(res.url)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Mail className="h-4 w-4" /> Convidar entregador
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo convite</DialogTitle>
          <DialogDescription>Gera um link de convite para um entregador entrar na sua organização.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input id="email" name="email" type="email" placeholder="Deixe em branco para link genérico" />
            <p className="text-xs text-muted-foreground">Se preenchido, só essa conta pode aceitar o convite.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expiresInDays">Expira em</Label>
            <Select name="expiresInDays" value={expiresInDays} onValueChange={(v) => setExpiresInDays(v ?? "7")}>
              <SelectTrigger id="expiresInDays" className="w-full">
                <SelectValue>{(v: string | null) => ({ "1": "1 dia", "7": "7 dias", "30": "30 dias", "0": "Sem expiração" }[v ?? "7"])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="0">Sem expiração</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Gerando..." : "Gerar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InvitesPanel({ invites, acceptedInvites }: { invites: Invite[]; acceptedInvites: AcceptedInvite[] }) {
  const [isPending, startTransition] = useTransition()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  function handleCopy() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Convites</h2>
          <div className="flex items-center gap-2">
            {invites.length > 0 && (
              <Button
                size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive"
                disabled={isPending}
                onClick={() => startTransition(() => revokeAllPendingInvites())}
              >
                <ShieldOff className="h-3.5 w-3.5" /> Revogar todos
              </Button>
            )}
            <NewInviteDialog onCreated={(url) => { setLink(url); setCopied(false) }} />
          </div>
        </div>

        {link && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
            <span className="flex-1 truncate font-mono">{link}</span>
            <Button size="sm" variant="ghost" className="gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {inv.email ?? "Link genérico"} · expira {formatDate(inv.expiresAt)}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() => startTransition(() => revokeInvite(inv.id))}
                  aria-label="Revogar convite"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="mt-4 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? "Ocultar" : "Ver"} histórico de convites aceitos ({acceptedInvites.length})
        </button>

        {showHistory && (
          acceptedInvites.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum convite aceito ainda.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {acceptedInvites.map((inv) => (
                <li key={inv.id} className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{inv.acceptedByName}</strong> aceitou{" "}
                  {inv.email ? `o convite de ${inv.email}` : "um convite"} em {formatDate(inv.acceptedAt)}
                </li>
              ))}
            </ul>
          )
        )}
      </CardContent>
    </Card>
  )
}
