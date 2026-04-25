import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const Schema = z.object({
  companyId: z.number().int().positive(),
  dryRun:    z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  // Fetch all active pools with a monthly rate for this company
  const pools = await db.execute(sql`
    SELECT id, name, client_name, client_email, monthly_rate
    FROM pools
    WHERE company_id = ${data.companyId}
      AND monthly_rate IS NOT NULL
      AND monthly_rate > 0
      AND status = 'active'
  `);

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dueDate    = new Date(now.getFullYear(), now.getMonth() + 1, 1); // due 1st of next month

  const created: any[] = [];
  const skipped: any[] = [];

  for (const pool of pools.rows as any[]) {
    // Skip if an invoice for this pool already exists this month
    const existing = await db.execute(sql`
      SELECT id FROM invoices
      WHERE pool_id  = ${pool.id}
        AND company_id = ${data.companyId}
        AND created_at >= ${monthStart.toISOString()}::timestamp
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      skipped.push({ poolId: pool.id, name: pool.name, reason: "already invoiced this month" });
      continue;
    }

    if (data.dryRun) {
      created.push({ poolId: pool.id, name: pool.name, amount: pool.monthly_rate, dryRun: true });
      continue;
    }

    const lineItems = JSON.stringify([{ description: `Monthly pool service — ${monthLabel}`, qty: 1, rate: pool.monthly_rate }]);

    await db.execute(sql`
      INSERT INTO invoices (company_id, pool_id, client_name, client_email, amount, status, due_date, line_items, notes)
      VALUES (
        ${data.companyId},
        ${pool.id},
        ${pool.client_name},
        ${pool.client_email ?? null},
        ${pool.monthly_rate},
        'draft',
        ${dueDate.toISOString()}::timestamp,
        ${lineItems},
        ${"Auto-generated monthly invoice — " + monthLabel}
      )
    `);

    created.push({ poolId: pool.id, name: pool.name, amount: pool.monthly_rate });
  }

  return NextResponse.json({ created, skipped, total: created.length, month: monthLabel });
}
