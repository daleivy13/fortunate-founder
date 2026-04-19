// Add this table to your existing schema.ts file
// It tracks how many free chemistry checks each homeowner has used per week

import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";

export const homeownerUsage = pgTable("homeowner_usage", {
  id:     serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  week:   text("week").notNull(),       // e.g. "2024-W16"
  count:  integer("count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homeownerProfiles = pgTable("homeowner_profiles", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull().unique(),
  email:         text("email"),
  poolVolume:    integer("pool_volume"),
  poolType:      text("pool_type").default("inground"),
  zipCode:       text("zip_code"),
  isPro:         text("is_pro").default("false"),    // "true" = paid Pool+
  stripeSubId:   text("stripe_sub_id"),
  subStatus:     text("sub_status").default("free"), // free | trialing | active | canceled
  createdAt:     timestamp("created_at").defaultNow(),
});

// NOTE: Add both of these exports to your existing src/backend/db/schema.ts file
// alongside the existing table definitions. Then run: npm run db:push
