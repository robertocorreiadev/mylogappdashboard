// Seed da base de PIOR CASO (lib/fixtures/worst-case.ts) num banco de TESTE.
//
// Nunca roda no endpoint do DATABASE_URL (produção): a trava seedTargetAllowed
// recusa o mesmo endpoint Neon (com ou sem "-pooler") e recusa se o
// DATABASE_URL não estiver definido (rode com --env-file=.env).
//
// Uso (do diretório do projeto), num banco de teste com o schema já criado
// (DDL da spec, §4.2):
//   SEED_DATABASE_URL="postgres://usuario:senha@host/banco_teste" \
//     node --env-file=.env node_modules/jiti/lib/jiti-cli.mjs scripts/seed-worst-case.ts --yes
// (JITI_ALIAS='{"@":"<caminho do projeto>"}' se o alias @ não resolver.)
//
// Cria 1 organização, 3 entregadores (senha inutilizável: login só pelo
// admin) e as boletas e lançamentos do fixture. Rodar de novo apaga e recria
// só o que pertence à organização do fixture (id fixo 900), inclusive pacotes
// criados depois; aborta se os ids 900–903 forem de outra pessoa.
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, inArray, sql } from "drizzle-orm"
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
  const { users, organizations, memberships, dailyRecords, transactions, deliveries } = schema
  const ids = WORST_CASE_MEMBERS.map((m) => m.userId)

  await db.transaction(async (tx) => {
    // Num branch do Neon há cópias de usuários reais: os ids fixos só podem
    // ser apagados se forem do fixture (mesmo e-mail). Senão, aborta.
    const emails = new Set<string>(WORST_CASE_MEMBERS.map((m) => m.email))
    const taken = await tx.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ids))
    const foreign = taken.filter((u) => !emails.has(u.email))
    if (foreign.length) throw new Error(`ABORTADO: os ids ${foreign.map((u) => u.id).join(", ")} pertencem a usuários que não são do fixture.`)
    const [org] = await tx.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, WORST_CASE_ORG_ID))
    if (org && org.slug !== "pior-caso-teste") throw new Error(`ABORTADO: a organização ${WORST_CASE_ORG_ID} não é a do fixture (slug ${org.slug}).`)

    // deliveries não tem cascade pela organização: sai antes (pacotes criados no smoke test).
    await tx.delete(deliveries).where(eq(deliveries.organizationId, WORST_CASE_ORG_ID))
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

    // Ids fixos em colunas serial: avança as sequências, senão o próximo
    // cadastro ou organização tenta usar 900–903 e quebra.
    await tx.execute(sql`select setval(pg_get_serial_sequence('users', 'id'), (select max(id) from users))`)
    await tx.execute(sql`select setval(pg_get_serial_sequence('organizations', 'id'), (select max(id) from organizations))`)
  })

  console.log(`ok: organização ${WORST_CASE_ORG_ID}, ${ids.length} entregadores, ${worstCaseDailyRecords().length} boletas, ${worstCaseTransactions().length} lançamentos.`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
