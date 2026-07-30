import { redirect } from "next/navigation"
import { Package, Database } from "lucide-react"
import { getUserId } from "@/lib/session"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function LoginPage() {
  const userId = await getUserId()
  if (userId) redirect("/select")

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-10 shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <Package className="h-8 w-8" aria-hidden="true" />
          <span>MYLOG</span>
        </div>
        <h1 className="mb-8 text-center text-lg text-muted-foreground">Painel de Controle</h1>

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

