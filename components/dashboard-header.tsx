"use client"

import { useState, useTransition } from "react"
import { Package, LogOut, Settings, KeyRound, User } from "lucide-react"
import { logout, updateProfile, changePassword } from "@/app/actions/auth"
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

// ── Header principal ──────────────────────────────────────────
export function DashboardHeader({
  userName, userEmail, panelName, panel, isAdmin = false, viewerMode,
}: {
  userName: string
  userEmail: string
  panelName?: string
  panel?: string
  isAdmin?: boolean
  /**
   * Gestor visualizando o painel somente-leitura de um entregador (drill-down),
   * ou o modo ADMIN MASTER (mode: "admin") — mesma UI, escrita habilitada,
   * visual de alerta em vez de "somente leitura" pra deixar claro que ali há
   * capacidade destrutiva ativa. Ver app/actions/admin-override.ts.
   */
  viewerMode?: { entregadorName: string; mode?: "gestor" | "admin"; backHref?: string }
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const year = new Date().getFullYear()
  const isAdminMode = viewerMode?.mode === "admin"
  const backHref = viewerMode?.backHref ?? (isAdminMode ? "/gestao" : "/gestor")

  return (
    <>
      {viewerMode && (
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 ${
            isAdminMode
              ? "border-destructive/50 bg-destructive/10"
              : "border-[var(--chart-2)]/40 bg-[var(--chart-2)]/10"
          }`}
        >
          <p className="text-sm text-foreground">
            {isAdminMode ? (
              <>⚠ Modo ADMIN MASTER — editando <strong>{viewerMode.entregadorName}</strong></>
            ) : (
              <>Visualizando como gestor: <strong>{viewerMode.entregadorName}</strong> · somente leitura</>
            )}
          </p>
          <a href={backHref}>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              ← Voltar
            </Button>
          </a>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Logo — volta para a seleção de painel, sem depender do botão "voltar" do navegador */}
        <a
          href={viewerMode ? backHref : "/select"}
          className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
          aria-label="Voltar à seleção de painel"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-primary">{panelName ?? "JADLOG"}</p>
            <p className="text-xs text-muted-foreground">Painel de Controle · {year}</p>
          </div>
        </a>

        {/* Direita: usuário + engrenagem + sair */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Logado como</p>
            <p className="text-sm font-semibold text-foreground">{userName}</p>
          </div>

          {/* Engrenagem → abre modal de configurações (não faz sentido no drill-down do gestor) */}
          {!viewerMode && (
            <Button
              variant="ghost" size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configurações da conta"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {/* Botão Gestão (usuários + organizações, somente admin) */}
          {isAdmin && !viewerMode && (
            <a href="/gestao">
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <User className="h-4 w-4" aria-hidden="true" />
                Gestão
              </Button>
            </a>
          )}

          {/* Botão Trocar painel */}
          {!viewerMode && (
            <a href="/select">
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                ⇄ Trocar painel
              </Button>
            </a>
          )}

          {/* Botão Sair */}
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </Button>
          </form>
        </div>
      </header>

      {/* Modal de configurações com abas */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
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
