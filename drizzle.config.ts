// @ts-nocheck
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/backend/db/schema.ts",
    "./src/backend/db/homeowner-schema.ts",
    "./src/backend/db/tasks-schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
