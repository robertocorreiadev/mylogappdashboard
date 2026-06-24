import { pgTable, serial, text, numeric, date, timestamp, integer } from "drizzle-orm/pg-core"

// Tabela de usuários (login individual)
export const users = pgTable("users", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId:     text("google_id").unique(),
  avatarUrl:    text("avatar_url"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Boleta diária de entregas (vinculada ao usuário)
export const dailyRecords = pgTable("daily_records", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:             date("date").notNull(),
  valuePerDelivery: numeric("value_per_delivery", { precision: 10, scale: 2 }).notNull().default("3.50"),
  delivered:        integer("delivered").notNull().default(0),
  scheduled:        integer("scheduled").notNull().default(0),
  occurrences:      integer("occurrences").notNull().default(0),
  expenses:         numeric("expenses", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Entregas de rastreio (vinculadas ao usuário)
export const deliveries = pgTable("deliveries", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trackingCode: text("tracking_code").notNull(),
  recipient:    text("recipient").notNull(),
  address:      text("address"),
  city:         text("city"),
  status:       text("status").notNull().default("pendente"),
  value:        numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  deadline:     date("deadline"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Transações financeiras (vinculadas ao usuário)
export const transactions = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:        text("type").notNull().default("receita"),
  description: text("description").notNull(),
  category:    text("category"),
  amount:      numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  date:        date("date").notNull().defaultNow(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type User        = typeof users.$inferSelect
export type DailyRecord = typeof dailyRecords.$inferSelect
export type Delivery    = typeof deliveries.$inferSelect
export type Transaction = typeof transactions.$inferSelect
