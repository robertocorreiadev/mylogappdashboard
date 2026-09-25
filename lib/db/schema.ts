import { pgTable, serial, bigserial, text, numeric, date, timestamp, integer, jsonb, unique, index } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId:     text("google_id").unique(),
  avatarUrl:    text("avatar_url"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Organização = a empresa/gestor terceiro que enxerga o espelho da operação dos seus entregadores.
export const organizations = pgTable("organizations", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  slug:        text("slug").notNull().unique(),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id),
  status:      text("status").notNull().default("active"), // "active" | "suspended"
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Vínculo user <-> org com papel. Um usuário tem no máximo UMA membership "active"
// POR PAPEL — pode acumular 'gestor' + 'entregador' simultaneamente na mesma
// organização (dual-role), mas nunca duas 'gestor' nem duas 'entregador' ativas
// ao mesmo tempo (índice único parcial memberships_one_active_role_per_user,
// ver migrate-multitenant-001-schema.sql / migrate-multitenant-001b-dual-role-index.sql).
export const memberships = pgTable("memberships", {
  id:               serial("id").primaryKey(),
  organizationId:   integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:             text("role").notNull(), // "gestor" | "entregador"
  status:           text("status").notNull().default("active"), // "active" | "removed"
  invitedByUserId:  integer("invited_by_user_id").references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt:        timestamp("removed_at", { withTimezone: true }),
}, (t) => [
  index("memberships_org_id_idx").on(t.organizationId),
])

// Convites gerados pelo gestor. Token de alta entropia armazenado só como hash (sha256).
export const invites = pgTable("invites", {
  id:                 serial("id").primaryKey(),
  organizationId:     integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tokenHash:          text("token_hash").notNull().unique(),
  role:               text("role").notNull().default("entregador"),
  email:              text("email"), // opcional: restringe o aceite a um e-mail específico
  createdByUserId:    integer("created_by_user_id").notNull().references(() => users.id),
  expiresAt:          timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt:         timestamp("accepted_at", { withTimezone: true }),
  acceptedByUserId:   integer("accepted_by_user_id").references(() => users.id),
  revokedAt:          timestamp("revoked_at", { withTimezone: true }),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("invites_org_id_idx").on(t.organizationId),
])

// Auditoria append-only das edições feitas pelo entregador nos próprios registros.
// Nunca ganha actions de update/delete no app — só inserção.
export const auditLogs = pgTable("audit_logs", {
  id:             bigserial("id", { mode: "number" }).primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorUserId:    integer("actor_user_id").notNull().references(() => users.id),
  entityType:     text("entity_type").notNull(), // "daily_record" | "delivery" | "transaction"
  entityId:       integer("entity_id").notNull(),
  action:         text("action").notNull(), // "create" | "update" | "delete"
  fieldChanges:   jsonb("field_changes"),
  snapshotBefore: jsonb("snapshot_before"),
  snapshotAfter:  jsonb("snapshot_after"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_org_entity_idx").on(t.organizationId, t.entityType, t.entityId),
  index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt),
])

// panel: "jadlog" | "panel2" — separa os dados de cada transportadora
export const dailyRecords = pgTable("daily_records", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId:   integer("organization_id").notNull().references(() => organizations.id),
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
  index("daily_records_org_idx").on(t.organizationId),
])

export const deliveries = pgTable("deliveries", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  panel:          text("panel").notNull().default("jadlog"),
  trackingCode:   text("tracking_code").notNull(),
  recipient:      text("recipient").notNull(),
  address:        text("address"),
  city:           text("city"),
  status:         text("status").notNull().default("pendente"),
  value:          numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  deadline:       date("deadline"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("deliveries_org_idx").on(t.organizationId),
])

export const transactions = pgTable("transactions", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  panel:          text("panel").notNull().default("jadlog"),
  type:           text("type").notNull().default("receita"),
  description:    text("description").notNull(),
  category:       text("category"),
  amount:         numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  date:           date("date").notNull().defaultNow(),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("transactions_org_idx").on(t.organizationId),
])

export type User         = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Membership   = typeof memberships.$inferSelect
export type Invite       = typeof invites.$inferSelect
export type AuditLog     = typeof auditLogs.$inferSelect
export type DailyRecord  = typeof dailyRecords.$inferSelect
export type Delivery     = typeof deliveries.$inferSelect
export type Transaction  = typeof transactions.$inferSelect
