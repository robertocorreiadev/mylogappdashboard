import { describe, it, expect } from "vitest"
import { planUserDeletion } from "./user-deletion"

// D8 (spec §15): excluir usuário em cascata, sem levar dados de outras pessoas.
describe("planUserDeletion", () => {
  it("usuário sem organização própria → pode excluir, nenhuma org junto", () => {
    expect(planUserDeletion({ ownedOrgs: [] })).toEqual({ ok: true, soloOrgIds: [] })
  })

  it("organização própria só com ele → apaga a organização junto", () => {
    expect(planUserDeletion({ ownedOrgs: [{ id: 3, name: "Solo", otherMembers: 0 }] }))
      .toEqual({ ok: true, soloOrgIds: [3] })
  })

  it("dono de organização com outros membros → recusa e diz qual", () => {
    expect(planUserDeletion({ ownedOrgs: [{ id: 1, name: "Legado", otherMembers: 4 }] })).toEqual({
      ok: false,
      error: "Não é possível excluir: este usuário é dono da organização \"Legado\", que tem outros 4 membros. Excluir apagaria os dados deles.",
    })
  })

  it("recusa se qualquer uma das organizações próprias for compartilhada", () => {
    const r = planUserDeletion({ ownedOrgs: [{ id: 3, name: "Solo", otherMembers: 0 }, { id: 5, name: "Equipe", otherMembers: 1 }] })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toContain("\"Equipe\", que tem outro membro")
  })
})
