"use client"

import { useState, useTransition } from "react"
import { Building2 } from "lucide-react"
import { createOrganizationForGestor } from "@/app/actions/organizations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ExistingUser = { id: number; name: string; email: string }

export function CreateOrganizationPanel({ users }: { users: ExistingUser[] }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [userId, setUserId] = useState<string | undefined>(users[0] ? String(users[0].id) : undefined)
  const usersById = Object.fromEntries(users.map((u) => [String(u.id), `${u.name} — ${u.email}`]))
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  function handleSubmit(fd: FormData) {
    setMsg(null)
    fd.set("mode", mode)
    startTransition(async () => {
      const res = await createOrganizationForGestor(fd)
      if (res?.error) {
        setMsg({ type: "err", text: res.error })
      } else {
        setMsg(null)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setMsg(null) }}>
      <DialogTrigger render={<Button type="button" className="gap-2" />}>
        <Building2 className="h-4 w-4" />
        Nova organização
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova organização</DialogTitle>
          <DialogDescription>
            Cria uma organização e torna um usuário seu gestor (visão agregada + drill-down
            somente-leitura sobre a frota, sem lançar boletas).
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="orgName">Nome da organização</Label>
            <Input id="orgName" name="orgName" required placeholder="Ex.: Transportes Silva" />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Usuário existente</TabsTrigger>
              <TabsTrigger value="new">Novo usuário</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="grid gap-1.5 pt-2">
              <Label htmlFor="userId">Gestor</Label>
              <Select name="userId" value={userId} onValueChange={(v) => setUserId(v ?? undefined)}>
                <SelectTrigger id="userId" className="w-full">
                  <SelectValue placeholder="Selecione um usuário">
                    {(value: string | null) => value ? usersById[value] : "Selecione um usuário"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum usuário cadastrado ainda — use &quot;Novo usuário&quot;.</p>
              )}
            </TabsContent>

            <TabsContent value="new" className="grid gap-4 pt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome do gestor</Label>
                <Input id="name" name="name" placeholder="Nome completo" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" placeholder="gestor@empresa.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Senha inicial</Label>
                <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" />
              </div>
            </TabsContent>
          </Tabs>

          {msg && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{msg.text}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar organização"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
