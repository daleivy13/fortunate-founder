import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { getTierByKey, getApplicableDiscounts, applyDiscounts } from "@/lib/insurance/pricing";

const Schema = z.object({
  tierKey:    z.string().min(1),
  poolId:     z.number().int().positive().optional(),
  annualPay:  z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const tier = getTierByKey(data.tierKey);
  if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

  // Re-run eligibility checks inline
  const discountChecks: Record<string, boolean> = { annualPay: data.annualPay };

  // Optimal streak
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT consecutive_optimal_days FROM compliance_status WHERE pool_id = ${data.poolId} LIMIT 1`);
      discountChecks.optimalStreak = ((r.rows[0] as any)?.consecutive_optimal_days ?? 0) >= 14;
    } catch { /* */ }

    // Saltwater
    try {
      const r = await db.execute(sql`SELECT has_saltwater FROM homeowner_profiles WHERE user_uid = ${auth.uid} LIMIT 1`);
      discountChecks.saltwater = (r.rows[0] as any)?.has_saltwater ?? false;
    } catch { /* */ }

    // Weekly service
    try {
      const r = await db.execute(sql`SELECT service_frequency FROM homeowner_profiles WHERE user_uid = ${auth.uid} LIMIT 1`);
      const freq = (r.rows[0] as any)?.service_frequency ?? "";
      discountChecks.weeklyService = freq.toLowerCase().includes("weekly");
    } catch { /* */ }

    // Pro service verified
    try {
      const r = await db.execute(sql`SELECT id FROM service_reports WHERE pool_id = ${data.poolId} AND verification_status = 'clean' LIMIT 1`);
      discountChecks.proServiceVerified = r.rows.length > 0;
    } catch {
      discountChecks.proServiceVerified = false;
    }
  }

  const discounts  = getApplicableDiscounts(discountChecks);
  const basePrice  = data.annualPay ? tier.annualPrice : tier.monthlyPrice;
  const finalPrice = applyDiscounts(basePrice, discounts);
  const totalDiscountPct = Math.min(discounts.reduce((s, d) => s + d.pct, 0), 35);

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

  let quoteId: number | null = null;
  try {
    const r = await db.execute(sql`
      INSERT INTO insurance_quotes (
        user_uid, pool_id, tier, monthly_price, annual_price,
        discounts, discount_total_pct, expires_at, status
      ) VALUES (
        ${auth.uid}, ${data.poolId ?? null}, ${data.tierKey},
        ${data.annualPay ? null : finalPrice},
        ${data.annualPay ? finalPrice : null},
        ${JSON.stringify(discounts)}::jsonb,
        ${totalDiscountPct},
        ${expiresAt.toISOString()},
        'pending'
      ) RETURNING id
    `);
    quoteId = (r.rows[0] as any)?.id ?? null;
  } catch { /* non-fatal */ }

  return NextResponse.json({
    quoteId,
    tier,
    basePrice,
    finalPrice,
    discounts,
    totalDiscountPct,
    annualPay:  data.annualPay,
    expiresAt:  expiresAt.toISOString(),
    savingsPerYear: Math.round((basePrice - finalPrice) * (data.annualPay ? 1 : 12) * 100) / 100,
  });
}
