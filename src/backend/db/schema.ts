import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  serial,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────────
export const planEnum = pgEnum("plan", ["small", "medium", "large"]);
export const poolTypeEnum = pgEnum("pool_type", ["residential", "commercial", "hoa"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "complete", "sent"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);
export const routeStatusEnum = pgEnum("route_status", ["scheduled", "in_progress", "complete"]);

// ── Users / Companies ─────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  firebaseUid: text("firebase_uid").unique(),
  companyId: integer("company_id").references(() => companies.id),
  role: text("role").default("owner"), // owner | tech | admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id"),
  plan: planEnum("plan").default("small"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("trialing"),
  trialEndsAt: timestamp("trial_ends_at"),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Pools ─────────────────────────────────────────────────────────────────────
export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  address: text("address").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  type: poolTypeEnum("type").default("residential"),
  volumeGallons: integer("volume_gallons"),
  notes: text("notes"),
  monthlyRate: real("monthly_rate"),
  serviceDay: text("service_day"), // mon, tue, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Chemistry Readings ────────────────────────────────────────────────────────
export const chemistryReadings = pgTable("chemistry_readings", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => pools.id).notNull(),
  techId: text("tech_id").references(() => users.id),
  freeChlorine: real("free_chlorine"),      // ppm
  combinedChlorine: real("combined_chlorine"),
  ph: real("ph"),
  totalAlkalinity: real("total_alkalinity"), // ppm
  calciumHardness: real("calcium_hardness"), // ppm
  cyanuricAcid: real("cyanuric_acid"),       // ppm
  salt: real("salt"),                        // ppm
  tds: real("tds"),                          // ppm
  waterTemp: real("water_temp"),             // F
  aiDosageRecommendation: text("ai_dosage_recommendation"), // JSON string
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// ── Service Reports ───────────────────────────────────────────────────────────
export const serviceReports = pgTable("service_reports", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => pools.id).notNull(),
  techId: text("tech_id").references(() => users.id),
  routeId: integer("route_id").references(() => routes.id),
  status: reportStatusEnum("status").default("pending"),
  chemReadingId: integer("chem_reading_id").references(() => chemistryReadings.id),
  // Checklist
  skimmed: boolean("skimmed").default(false),
  brushed: boolean("brushed").default(false),
  vacuumed: boolean("vacuumed").default(false),
  filterCleaned: boolean("filter_cleaned").default(false),
  chemicalsAdded: boolean("chemicals_added").default(false),
  equipmentChecked: boolean("equipment_checked").default(false),
  // Details
  chemicalsUsed: text("chemicals_used"),  // JSON
  issuesFound: text("issues_found"),
  photos: text("photos"),                 // JSON array of URLs
  techNotes: text("tech_notes"),
  pdfUrl: text("pdf_url"),
  clientEmailedAt: timestamp("client_emailed_at"),
  servicedAt: timestamp("serviced_at").defaultNow(),
});

// ── Routes ────────────────────────────────────────────────────────────────────
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  techId: text("tech_id").references(() => users.id),
  name: text("name").notNull(),
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  status: routeStatusEnum("status").default("scheduled"),
  estimatedMiles: real("estimated_miles"),
  actualMiles: real("actual_miles"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routeStops = pgTable("route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  poolId: integer("pool_id").references(() => pools.id).notNull(),
  order: integer("order").notNull(),
  status: text("status").default("pending"), // pending | arrived | complete | skipped
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
});

// ── Mileage Logs ──────────────────────────────────────────────────────────────
export const mileageLogs = pgTable("mileage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  routeId: integer("route_id").references(() => routes.id),
  date: text("date").notNull(),
  miles: real("miles").notNull(),
  purpose: text("purpose").default("Pool service route"),
  deductionRate: real("deduction_rate").default(0.67), // IRS 2024 rate
  taxDeduction: real("tax_deduction"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  poolId: integer("pool_id").references(() => pools.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  amount: real("amount").notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  dueDate: text("due_date"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  lineItems: text("line_items").notNull(), // JSON
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").default("technician"),
  hourlyRate: real("hourly_rate"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const companiesRelations = relations(companies, ({ many }) => ({
  pools: many(pools),
  routes: many(routes),
  invoices: many(invoices),
  employees: many(employees),
}));

export const poolsRelations = relations(pools, ({ one, many }) => ({
  company: one(companies, { fields: [pools.companyId], references: [companies.id] }),
  chemReadings: many(chemistryReadings),
  serviceReports: many(serviceReports),
  routeStops: many(routeStops),
  invoices: many(invoices),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  company: one(companies, { fields: [routes.companyId], references: [companies.id] }),
  tech: one(users, { fields: [routes.techId], references: [users.id] }),
  stops: many(routeStops),
  serviceReports: many(serviceReports),
}));
