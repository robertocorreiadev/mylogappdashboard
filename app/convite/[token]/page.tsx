import Link from "next/link"
import { Package, Database } from "lucide-react"
import { getUserId } from "@/lib/session"
import { logout, requireUser } from "@/app/actions/auth"
import { getInviteByToken } from "@/lib/invites"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { AcceptInviteButton } from "@/components/accept-invite-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Este link de convite não é válido.",
  expired: "Este convite expirou. Peça ao seu gestor para gerar um novo link.",
  revoked: "Este convite foi revogado.",
  accepted: "Este convite já foi utilizado.",
}

function InviteError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-2xl sm:p-10">
        <Package className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="mb-2 text-lg font-bold text-foreground">Convite indisponível</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Ir para o login
        </Link>
      </div>
    </main>
  )
}

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const status = await getInviteByToken(token)

  if (!status.valid) {
    return <InviteError message={REASON_MESSAGES[status.reason]} />
  }

  const userId = await getUserId()
  if (userId) {
    // Mostra com qual conta o convite será aceito e deixa trocar (sai e volta aqui).
    const viewer = await requireUser().catch(() => null)
    return (
      <main className="flex min-h-screen items-center justify-center p-4 sm:p-5">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-2xl sm:p-10">
          <Package className="mx-auto mb-4 h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="mb-2 text-lg font-bold text-foreground">Convite para {status.orgName}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Aceitar vincula sua conta a esta organização como entregador.
          </p>
          {viewer && (
            <p className="mb-4 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Você está entrando como <strong className="text-foreground">{viewer.email}</strong>.
            </p>
          )}
          <AcceptInviteButton token={token} />
          <form action={logout} className="mt-4">
            <input type="hidden" name="next" value={`/convite/${token}`} />
            <button type="submit" className="text-xs font-medium text-primary hover:underline">
              Não é você? Trocar conta
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-10">
        <div className="mb-4 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" aria-hidden="true" />
          <span>MYLOG</span>
        </div>
        <h1 className="mb-1 text-center text-base font-semibold text-foreground">Convite para {status.orgName}</h1>
        <p className="mb-2 text-center text-sm text-muted-foreground">Crie sua conta ou entre para aceitar.</p>
        {status.email && (
          <p className="mb-6 text-center text-xs text-muted-foreground">
            Este convite é exclusivo para <strong className="text-foreground">{status.email}</strong>.
          </p>
        )}

        <Tabs defaultValue="register">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Criar conta</TabsTrigger>
            <TabsTrigger value="login">Já tenho conta</TabsTrigger>
          </TabsList>
          <TabsContent value="register" className="mt-4">
            <RegisterForm inviteToken={token} />
          </TabsContent>
          <TabsContent value="login" className="mt-4">
            <LoginForm inviteToken={token} />
          </TabsContent>
        </Tabs>

        <div className="mt-5 flex items-start gap-2 rounded-md border-l-[3px] border-primary bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Seus dados ficam vinculados à sua conta.</span>
        </div>
      </div>
    </main>
  )
}
