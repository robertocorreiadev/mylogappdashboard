// Seed da base de PIOR CASO (lib/fixtures/worst-case.ts) num banco de TESTE.
//
// Nunca roda no banco do DATABASE_URL (produção): a trava seedTargetAllowed
// compara host e nome do banco e recusa se forem os mesmos.
//
// Uso (do diretório do projeto), num banco de teste com o schema já criado
// (DDL da spec, §4.2):
//   SEED_DATABASE_URL="postgres://usuario:senha@host/banco_teste" \
//     node --env-file=.env node_modules/jiti/lib/jiti-cli.mjs scripts/seed-worst-case.ts --yes
// (JITI_ALIAS='{"@":"<caminho do projeto>"}' se o alias @ não resolver.)
//
// Cria 1 organização, 3 entregadores (senha inutilizável: login só pelo
// admin) e as boletas e lançamentos do fixture. Rodar de novo apaga e recria
// só o que pertence à organização do fixture (id fixo 900).
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, inArray } from "drizzle-orm"
import * as schema from "@/lib/db/schema"
import { seedTargetAllowed } from "@/lib/seed-guard"
import {
  WORST_CASE_MEMBERS, WORST_CASE_ORG_ID, worstCaseDailyRecords, worstCaseTransactions,
} from "@/lib/fixtures/worst-case"

async function main() {
  const target = process.env.SEED_DATABASE_URL
  if (!seedTargetAllowed(target, process.env.DATABASE_URL)) {
    console.error("RECUSADO: defina SEED_DATABASE_URL para um banco de TESTE, diferente do DATABASE_URL (produção).")
    process.exit(1)
  }
  if (!process.argv.includes("--yes")) {
    console.error(`Vai apagar e recriar a organização ${WORST_CASE_ORG_ID} e seus dados em ${new URL(target!).hostname}. Rode de novo com --yes.`)
    process.exit(1)
  }

  const pool = new Pool({ connectionString: target })
  const db = drizzle(pool, { schema })
  const { users, organizations, memberships, dailyRecords, transactions } = schema
  const ids = WORST_CASE_MEMBERS.map((m) => m.userId)

  await db.transaction(async (tx) => {
    await tx.delete(dailyRecords).where(eq(dailyRecords.organizationId, WORST_CASE_ORG_ID))
    await tx.delete(transactions).where(eq(transactions.organizationId, WORST_CASE_ORG_ID))
    await tx.delete(memberships).where(eq(memberships.organizationId, WORST_CASE_ORG_ID))
    await tx.delete(organizations).where(eq(organizations.id, WORST_CASE_ORG_ID))
    await tx.delete(users).where(inArray(users.id, ids))

    // Senha "!" não é um hash válido: ninguém entra com senha nessas contas.
    await tx.insert(users).values(WORST_CASE_MEMBERS.map((m) => ({ id: m.userId, name: m.name, email: m.email, passwordHash: "!" })))
    await tx.insert(organizations).values({ id: WORST_CASE_ORG_ID, name: "Pior Caso (teste)", slug: "pior-caso-teste", ownerUserId: ids[0] })
    await tx.insert(memberships).values(WORST_CASE_MEMBERS.map((m) => ({ userId: m.userId, organizationId: WORST_CASE_ORG_ID, role: "entregador", status: "active" })))
    await tx.insert(dailyRecords).values(worstCaseDailyRecords().map(({ id: _id, ...r }) => r))
    await tx.insert(transactions).values(worstCaseTransactions().map(({ id: _id, ...t }) => t))
  })

  console.log(`ok: organização ${WORST_CASE_ORG_ID}, ${ids.length} entregadores, ${worstCaseDailyRecords().length} boletas, ${worstCaseTransactions().length} lançamentos.`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
