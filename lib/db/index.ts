import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"
import { withVerifyFullSsl } from "./ssl-mode"

// verify-full explícito: a integração Neon da Vercel gera sslmode=require (ver ssl-mode.ts).
export const pool = new Pool({ connectionString: withVerifyFullSsl(process.env.DATABASE_URL) })
export const db = drizzle(pool, { schema })
