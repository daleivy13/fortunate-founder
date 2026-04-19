// Add these tables to your existing src/backend/db/schema.ts
// They power the smart task tracking system

import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";

export const poolTasks = pgTable("pool_tasks", {
  id:              serial("id").primaryKey(),
  poolId:          integer("pool_id").notNull(),
  taskKey:         text("task_key").notNull(),        // e.g. "filter_clean"
  name:            text("name").notNull(),
  intervalDays:    integer("interval_days").notNull(),
  category:        text("category").notNull(),        // equipment|chemistry|cleaning|safety|seasonal
  icon:            text("icon").default("📋"),
  dueDate:         timestamp("due_date").notNull(),
  lastCompletedAt: timestamp("last_completed_at"),
  completedBy:     text("completed_by"),              // userId
  notes:           text("notes"),
  isActive:        boolean("is_active").default(true),
  createdAt:       timestamp("created_at").defaultNow(),
});

export const poolTaskHistory = pgTable("pool_task_history", {
  id:          serial("id").primaryKey(),
  taskId:      integer("task_id").notNull(),
  poolId:      integer("pool_id").notNull(),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at").defaultNow(),
  notes:       text("notes"),
  nextDueDate: timestamp("next_due_date"),
});

// Unique constraint: one entry per pool per task type
// Add to schema.ts:
// import { unique } from "drizzle-orm/pg-core";
// Then add to poolTasks table definition:
// }, (t) => ({ unq: unique().on(t.poolId, t.taskKey) })

// ── SQL migration to run manually ──────────────────────────────────────────────
// Run this in your Neon SQL editor (console.neon.tech → SQL editor):
/*
CREATE TABLE IF NOT EXISTS pool_tasks (
  id              SERIAL PRIMARY KEY,
  pool_id         INTEGER NOT NULL,
  task_key        TEXT NOT NULL,
  name            TEXT NOT NULL,
  interval_days   INTEGER NOT NULL,
  category        TEXT NOT NULL,
  icon            TEXT DEFAULT '📋',
  due_date        TIMESTAMP NOT NULL,
  last_completed_at TIMESTAMP,
  completed_by    TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (pool_id, task_key)
);

CREATE TABLE IF NOT EXISTS pool_task_history (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER NOT NULL,
  pool_id      INTEGER NOT NULL,
  completed_by TEXT,
  completed_at TIMESTAMP DEFAULT NOW(),
  notes        TEXT,
  next_due_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homeowner_usage (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  week       TEXT NOT NULL,
  count      INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, week)
);

CREATE TABLE IF NOT EXISTS homeowner_profiles (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE,
  email        TEXT,
  pool_volume  INTEGER,
  pool_type    TEXT DEFAULT 'inground',
  zip_code     TEXT,
  is_pro       TEXT DEFAULT 'false',
  stripe_sub_id TEXT,
  sub_status   TEXT DEFAULT 'free',
  created_at   TIMESTAMP DEFAULT NOW()
);
*/

// NOTE: After adding these exports to schema.ts, run: npm run db:push
// Or run the SQL above directly in your Neon console for immediate setup
