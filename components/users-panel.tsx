"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useTransition } from "react"
import { Pencil, KeyRound, Trash2, Users, ShieldAlert, MoreHorizontal } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateUserAdmin, setUserPasswordAdmin, deleteUserAdmin } from "@/app/actions/admin-users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"

type AdminUser = {
  id: number
  name: string
  email: string
  googleId: string | null
  createdAt: Date
}

function EditUserForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  function handleSubmit(fd: FormData) {
    setMsg(null)
    fd.append("id", String(user.id))
    startTransition(async () => {
      const res = await updateUserAdmin(fd)
      if (res?.error) setMsg({ type: "err", text: res.error })
      else            { toast.success("Dados atualizados!"); onClose() }
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={user.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required defaultValue={user.email} />
      </div>
      {msg && (
        <p className={`rounded-md px-3 py-2 text-xs font-medium ${msg.type === "ok" ? "bg-[var(--chart-2)]/10 text-[var(--chart-2)]" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ResetPasswordForm({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  function handleSubmit(fd: FormData) {
    setMsg(null)
    fd.append("id", String(userId))
    startTransition(async () => {
      const res = await setUserPasswordAdmin(fd)
      if (res?.error) setMsg({ type: "err", text: res.error })
      else            { toast.success("Senha redefinida!"); onClose() }
    })
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
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
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Redefinir senha"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Menu ⋯ de ações de um usuário (mesmo menu na tabela e nos cartões do celular).
function UserActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [passOpen, setPassOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Ações de ${user.name}`} />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => router.push(`/gestor/entregadores/${user.id}?from=gestao`)}>
            <ShieldAlert className="text-destructive" /> Abrir como ADMIN MASTER
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Editar nome e e-mail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPassOpen(true)}>
            <KeyRound /> Redefinir senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => setDeleteOpen(true)}>
            <Trash2 /> {isSelf ? "Excluir (é você)" : "Excluir usuário"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Altere nome e e-mail de {user.name}.</DialogDescription>
          </DialogHeader>
          <EditUserForm user={user} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para {user.name}. A senha atual não é necessária.</DialogDescription>
          </DialogHeader>
          <ResetPasswordForm userId={user.id} onClose={() => setPassOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Excluir ${user.name}?`}
        description="Isso também apagará permanentemente as boletas, entregas, lançamentos, vínculos e a auditoria desse usuário, e a organização individual dele, se houver. Dono de organização com outros membros não pode ser excluído. Essa ação não pode ser desfeita."
        confirmLabel="Excluir permanentemente"
        onConfirm={() => {
          const fd = new FormData()
          fd.append("id", String(user.id))
          return deleteUserAdmin(fd)
        }}
        onDone={() => toast.success(`${user.name} excluído`)}
      />
    </>
  )
}

function LoginBadge({ user }: { user: AdminUser }) {
  return <Badge variant={user.googleId ? "secondary" : "outline"}>{user.googleId ? "Google" : "Senha"}</Badge>
}

export function UsersPanel({ users, currentUserId }: { users: AdminUser[]; currentUserId: number }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Usuários cadastrados ({users.length})</h2>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <>
            {/* Celular: cartões */}
            <ul className="flex flex-col gap-2 sm:hidden">
              {users.map((u) => (
                <li key={u.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <LoginBadge user={u} /> desde {formatDate(u.createdAt)}
                    </p>
                  </div>
                  <UserActions user={u} isSelf={u.id === currentUserId} />
                </li>
              ))}
            </ul>

            {/* sm+: tabela */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><LoginBadge user={u} /></TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right"><UserActions user={u} isSelf={u.id === currentUserId} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
