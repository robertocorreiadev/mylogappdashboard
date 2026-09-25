// Organização "solo" criada automaticamente para quem se cadastra pelo
// fluxo público (app/page.tsx) como entregador independente — dono e único
// membro, sem papel de gestor associado. Mantém requireEntregador() (Fase 2)
// funcionando para cadastros novos antes do onboarding self-service completo
// de gestor (Fase 3) existir. slug = "user-<id>" garante unicidade trivial
// sem depender de slugify de nome/e-mail.
import { db } from "@/lib/db"
import { organizations, memberships } from "@/lib/db/schema"

export async function createSoloOrgForNewUser(userId: number, name: string) {
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({
      name: `Operação de ${name}`,
      slug: `user-${userId}`,
      ownerUserId: userId,
    }).returning()
    await tx.insert(memberships).values({
      organizationId: org.id,
      userId,
      role: "entregador",
    })
    return org
  })
}
