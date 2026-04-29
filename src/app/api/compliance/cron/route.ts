// Set up as Vercel Cron job daily at 6am UTC
// In vercel.json: { "crons": [{ "path": "/api/compliance/cron", "schedule": "0 6 * * *" }] }
// Set CRON_SECRET env var and pass as ?secret=xxx

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { updatePoolCompliance } from "@/lib/compliance/calculator";

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const poolRows = await db.execute(sql`
    SELECT id FROM pools WHERE is_active = true LIMIT 500
  `).catch(() => ({ rows: [] }));

  const pools = poolRows.rows as any[];
  const processed: number[] = [];
  const errors: { poolId: number; error: string }[] = [];

  for (const pool of pools) {
    try {
      await updatePoolCompliance(pool.id, db, sql);
      processed.push(pool.id);
    } catch (e: any) {
      errors.push({ poolId: pool.id, error: e.message });
    }
  }

  return NextResponse.json({
    processed: processed.length,
    errors:    errors.length,
    details:   errors,
    timestamp: new Date().toISOString(),
  });
}
