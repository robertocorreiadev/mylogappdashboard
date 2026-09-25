import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

// Teste de arquitetura: toda leitura/escrita nas tabelas operacionais
// (dailyRecords, deliveries, transactions) precisa passar por lib/db/scopes.ts,
// que exige organizationId no tipo. Uma query montada à mão em app/actions/*.ts
// é exatamente o tipo de esquecimento que vaza dados entre organizações.
const ACTIONS_DIR = path.resolve(__dirname, "../../app/actions")
const SCOPED_TABLES = ["dailyRecords", "deliveries", "transactions"]

function forbiddenPatternsFor(table: string) {
  return [`.from(${table})`, `db.update(${table})`, `db.delete(${table})`, `db.insert(${table})`]
}

describe("isolamento de tenant — queries diretas fora de lib/db/scopes.ts", () => {
  const actionFiles = fs.readdirSync(ACTIONS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))

  for (const file of actionFiles) {
    it(`${file} não deve montar query direta em dailyRecords/deliveries/transactions`, () => {
      const content = fs.readFileSync(path.join(ACTIONS_DIR, file), "utf-8")
      const hits = SCOPED_TABLES.flatMap((table) =>
        forbiddenPatternsFor(table).filter((pattern) => content.includes(pattern)),
      )
      expect(hits).toEqual([])
    })
  }
})
