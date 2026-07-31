import { pgTable, serial, text, numeric, date, timestamp, integer, unique } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId:     text("google_id").unique(),
  avatarUrl:    text("avatar_url"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// panel: "jadlog" | "panel2" — separa os dados de cada transportadora
export const dailyRecords = pgTable("daily_records", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  panel:            text("panel").notNull().default("jadlog"),
  date:             date("date").notNull(),
  valuePerDelivery: numeric("value_per_delivery", { precision: 10, scale: 2 }).notNull().default("3.50"),
  delivered:        integer("delivered").notNull().default(0),
  scheduled:        integer("scheduled").notNull().default(0),
  occurrences:      integer("occurrences").notNull().default(0),
  expenses:         numeric("expenses", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("daily_records_user_id_panel_date_key").on(t.userId, t.panel, t.date),
])

export const deliveries = pgTable("deliveries", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  panel:        text("panel").notNull().default("jadlog"),
  trackingCode: text("tracking_code").notNull(),
  recipient:    text("recipient").notNull(),
  address:      text("address"),
  city:         text("city"),
  status:       text("status").notNull().default("pendente"),
  value:        numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  deadline:     date("deadline"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  panel:       text("panel").notNull().default("jadlog"),
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
