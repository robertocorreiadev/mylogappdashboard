import { redirect } from "next/navigation"
import { Package, Database } from "lucide-react"
import { getUserId } from "@/lib/session"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Erros que o callback do Google devolve em ?error= (D4). Código desconhecido
// não mostra nada: o texto nunca vem da URL, só desta tabela.
const LOGIN_ERRORS: Record<string, string> = {
  google_cancelled:     "Login com Google cancelado.",
  google_invalid_state: "A sessão de login expirou. Tente entrar com Google de novo.",
  google_failed:        "Não foi possível entrar com Google. Tente de novo.",
  google_unverified:    "Não foi possível confirmar o e-mail desta conta Google. Entre com e-mail e senha, ou use uma conta @gmail.com ou da sua empresa (Google Workspace).",
  google_conflict:      "Este e-mail já está ligado a outra conta Google. Entre com essa conta ou com e-mail e senha.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const userId = await getUserId()
  if (userId) redirect("/select")

  const code = (await searchParams).error
  const errorMsg = typeof code === "string" ? LOGIN_ERRORS[code] : undefined

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-10">
        <div className="mb-8 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" aria-hidden="true" />
          <span>MYLOG</span>
        </div>
        <h1 className="mb-8 text-center text-lg text-muted-foreground">Painel de Controle</h1>

        {errorMsg && (
          <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {errorMsg}
          </p>
        )}

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <RegisterForm />
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

