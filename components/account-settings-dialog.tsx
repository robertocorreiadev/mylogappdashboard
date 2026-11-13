"use client"

import { useState, useTransition } from "react"
import { Settings, KeyRound, User } from "lucide-react"
import { updateProfile, changePassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Formulário de dados do perfil ─────────────────────────────
function ProfileForm({ userName, userEmail, onClose }: { userName: string; userEmail: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  function handleSubmit(fd: FormData) {
    setMsg(null)
    startTransition(async () => {
      const res = await updateProfile(fd)
      if (res?.error)   setMsg({ type: "err", text: res.error })
      else              setMsg({ type: "ok",  text: "Dados atualizados com sucesso!" })
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4 pt-2">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={userName} placeholder="Seu nome" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required defaultValue={userEmail} placeholder="seu@email.com" />
      </div>
      {msg && (
        <p className={`rounded-md px-3 py-2 text-xs font-medium ${msg.type === "ok" ? "bg-[var(--chart-2)]/10 text-[var(--chart-2)]" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar dados"}
      </Button>
    </form>
  )
}

// ── Formulário de alteração de senha ──────────────────────────
function PasswordForm() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  function handleSubmit(fd: FormData) {
    setMsg(null)
    startTransition(async () => {
      const res = await changePassword(fd)
      if (res?.error) setMsg({ type: "err", text: res.error })
      else            setMsg({ type: "ok",  text: "Senha alterada com sucesso!" })
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4 pt-2">
      <div className="grid gap-1.5">
        <Label htmlFor="current">Senha atual</Label>
        <Input id="current" name="current" type="password" required placeholder="••••••" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="newPass">Nova senha</Label>
        <Input id="newPass" name="newPass" type="password" required placeholder="Mínimo 6 caracteres" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirmPass">Confirmar nova senha</Label>
        <Input id="confirmPass" name="confirmPass" type="password" required placeholder="Repita a nova senha" />
      </div>
      {msg && (
        <p className={`rounded-md px-3 py-2 text-xs font-medium ${msg.type === "ok" ? "bg-[var(--chart-2)]/10 text-[var(--chart-2)]" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  )
}

// ── Modal "Configurações da conta" (aberto pelo menu de conta) ──
export function AccountSettingsDialog({
  open, onOpenChange, userName, userEmail,
}: { open: boolean; onOpenChange: (open: boolean) => void; userName: string; userEmail: string }) {
  const setSettingsOpen = onOpenChange
  const settingsOpen = open
  return (
    <>
      {/* Modal de configurações com abas */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configurações da conta
            </DialogTitle>
            <DialogDescription>
              Atualize seus dados de acesso.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2">
                <KeyRound className="h-4 w-4" /> Senha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileForm
                userName={userName}
                userEmail={userEmail}
                onClose={() => setSettingsOpen(false)}
              />
            </TabsContent>

            <TabsContent value="password">
              <PasswordForm />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
