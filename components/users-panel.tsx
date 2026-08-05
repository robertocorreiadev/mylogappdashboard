"use client"

import { useState, useTransition } from "react"
import { Pencil, KeyRound, Trash2, Users } from "lucide-react"
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
      else            { setMsg({ type: "ok", text: "Dados atualizados!" }); onClose() }
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
      else            { setMsg({ type: "ok", text: "Senha redefinida!" }); onClose() }
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

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [editOpen, setEditOpen]     = useState(false)
  const [passOpen, setPassOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteErr, setDeleteErr]   = useState<string | null>(null)

  function handleDelete() {
    setDeleteErr(null)
    const fd = new FormData()
    fd.append("id", String(user.id))
    startTransition(async () => {
      const res = await deleteUserAdmin(fd)
      if (res?.error) setDeleteErr(res.error)
      else            setDeleteOpen(false)
    })
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell className="text-muted-foreground">{user.email}</TableCell>
        <TableCell>
          <Badge variant={user.googleId ? "secondary" : "outline"}>
            {user.googleId ? "Google" : "Senha"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setPassOpen(true)} aria-label="Redefinir senha">
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isSelf} onClick={() => setDeleteOpen(true)} aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Altere nome e e-mail de {user.name}.</DialogDescription>
          </DialogHeader>
          <EditUserForm user={user} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para {user.name}. A senha atual não é necessária.</DialogDescription>
          </DialogHeader>
          <ResetPasswordForm userId={user.id} onClose={() => setPassOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {user.name}?</DialogTitle>
            <DialogDescription>
              Isso também apagará permanentemente todas as entregas, transações e boletas diárias desse usuário. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteErr && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{deleteErr}</p>
          )}
          <DialogFooter>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              {isPending ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
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
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {users.map(u => <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
