// Regra da exclusão de usuário em cascata (D8, spec §15). Função pura; quem
// executa é lib/db/delete-user.ts.
//
// Por que recusar o dono de organização compartilhada: apagar a organização
// levaria junto os dados de TODOS os membros dela. Só a organização individual
// (só ele de membro) vai junto com o usuário.

export type OwnedOrg = { id: number; name: string; otherMembers: number }

export type DeletionPlan =
  | { ok: true; soloOrgIds: number[] }
  | { ok: false; error: string }

export function planUserDeletion({ ownedOrgs }: { ownedOrgs: OwnedOrg[] }): DeletionPlan {
  const shared = ownedOrgs.find((o) => o.otherMembers > 0)
  if (shared) {
    const who = shared.otherMembers === 1 ? "outro membro" : `outros ${shared.otherMembers} membros`
    return {
      ok: false,
      error: `Não é possível excluir: este usuário é dono da organização "${shared.name}", que tem ${who}. Excluir apagaria os dados deles.`,
    }
  }
  return { ok: true, soloOrgIds: ownedOrgs.map((o) => o.id) }
}
