import { pgTable, serial, text, numeric, date, timestamp } from "drizzle-orm/pg-core"

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  profile: text("profile").notNull(),
  trackingCode: text("tracking_code").notNull(),
  recipient: text("recipient").notNull(),
  address: text("address"),
  city: text("city"),
  status: text("status").notNull().default("pendente"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  deadline: date("deadline"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  profile: text("profile").notNull(),
  type: text("type").notNull().default("receita"),
  description: text("description").notNull(),
  category: text("category"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  date: date("date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Delivery = typeof deliveries.$inferSelect
export type Transaction = typeof transactions.$inferSelect
