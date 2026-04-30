// SQL to run in Neon:
// CREATE TABLE IF NOT EXISTS eligibility_checks (
//   id SERIAL PRIMARY KEY,
//   user_uid TEXT NOT NULL,
//   pool_id INTEGER REFERENCES pools(id),
//   score INTEGER NOT NULL DEFAULT 0,
//   checks JSONB NOT NULL DEFAULT '{}',
//   eligible BOOLEAN DEFAULT false,
//   recommended_tier TEXT,
//   created_at TIMESTAMP DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS insurance_quotes (
//   id SERIAL PRIMARY KEY,
//   user_uid TEXT NOT NULL,
//   pool_id INTEGER REFERENCES pools(id),
//   tier TEXT NOT NULL,
//   monthly_price NUMERIC(10,2),
//   annual_price NUMERIC(10,2),
//   discounts JSONB DEFAULT '[]',
//   discount_total_pct INTEGER DEFAULT 0,
//   expires_at TIMESTAMP,
//   status TEXT DEFAULT 'pending',
//   stripe_price_id TEXT,
//   created_at TIMESTAMP DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS insurance_policies (
//   id SERIAL PRIMARY KEY,
//   user_uid TEXT NOT NULL,
//   quote_id INTEGER REFERENCES insurance_quotes(id),
//   pool_id INTEGER REFERENCES pools(id),
//   tier TEXT NOT NULL,
//   stripe_subscription_id TEXT,
//   status TEXT DEFAULT 'active',
//   starts_at TIMESTAMP DEFAULT NOW(),
//   ends_at TIMESTAMP,
//   monthly_price NUMERIC(10,2),
//   created_at TIMESTAMP DEFAULT NOW()
// );

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { INSURANCE_TIERS } from "@/lib/insurance/pricing";

const Schema = z.object({
  poolId: z.number().int().positive().optional(),
});

export interface EligibilityCheck {
  key:     string;
  label:   string;
  passed:  boolean;
  detail:  string;
  weight:  number; // contribution to score
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const checks: EligibilityCheck[] = [];

  // 1. Has a registered pool/profile
  let hasPool = false;
  try {
    if (data.poolId) {
      const r = await db.execute(sql`SELECT id FROM pools WHERE id = ${data.poolId} LIMIT 1`);
      hasPool = r.rows.length > 0;
    } else {
      const r = await db.execute(sql`SELECT id FROM homeowner_profiles WHERE user_uid = ${auth.uid} LIMIT 1`);
      hasPool = r.rows.length > 0;
    }
  } catch { /* */ }
  checks.push({ key: "has_profile", label: "Pool profile complete", passed: hasPool, detail: hasPool ? "Profile on file" : "Complete your pool profile to continue", weight: 20 });

  // 2. Recent chemistry reading (last 14 days)
  let hasRecentChem = false;
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT id FROM chemistry_readings WHERE pool_id = ${data.poolId} AND created_at > NOW() - INTERVAL '14 days' LIMIT 1`);
      hasRecentChem = r.rows.length > 0;
    } catch { /* */ }
  }
  checks.push({ key: "recent_chemistry", label: "Chemistry tested in last 14 days", passed: hasRecentChem, detail: hasRecentChem ? "Recent test on file" : "Log a chemistry reading to qualify", weight: 20 });

  // 3. Compliance status — not suspended
  let isCompliant = true;
  let complianceStatus = "compliant";
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT status FROM compliance_status WHERE pool_id = ${data.poolId} LIMIT 1`);
      complianceStatus = (r.rows[0] as any)?.status ?? "compliant";
      isCompliant = complianceStatus !== "suspended";
    } catch { /* */ }
  }
  checks.push({ key: "not_suspended", label: "Pool not in suspended status", passed: isCompliant, detail: isCompliant ? `Status: ${complianceStatus}` : "Resolve compliance suspension before applying", weight: 25 });

  // 4. Pro service verified (has service reports with verification status = clean)
  let hasVerifiedService = false;
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT id FROM service_reports WHERE pool_id = ${data.poolId} AND verification_status = 'clean' LIMIT 1`);
      hasVerifiedService = r.rows.length > 0;
    } catch {
      // table or column may not exist — treat as non-disqualifying
      hasVerifiedService = true;
    }
  } else {
    hasVerifiedService = true;
  }
  checks.push({ key: "verified_service", label: "Verified professional service on record", passed: hasVerifiedService, detail: hasVerifiedService ? "Service verification passed" : "Have your pool pro submit a verified service report", weight: 15 });

  // 5. Pool equipment registered
  let hasEquipment = false;
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT id FROM equipment WHERE pool_id = ${data.poolId} LIMIT 1`);
      hasEquipment = r.rows.length > 0;
    } catch { /* */ }
  }
  checks.push({ key: "equipment_registered", label: "Pool equipment registered", passed: hasEquipment, detail: hasEquipment ? "Equipment inventory on file" : "Add at least one piece of equipment", weight: 10 });

  // 6. Account age (at least 7 days)
  let accountOldEnough = false;
  try {
    const r = await db.execute(sql`SELECT created_at FROM homeowner_profiles WHERE user_uid = ${auth.uid} LIMIT 1`);
    const createdAt = (r.rows[0] as any)?.created_at;
    if (createdAt) {
      const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
      accountOldEnough = days >= 7;
    }
  } catch {
    accountOldEnough = true; // fallback to allow
  }
  checks.push({ key: "account_age", label: "Account active for 7+ days", passed: accountOldEnough, detail: accountOldEnough ? "Account verified" : "Account too new — check back in 7 days", weight: 10 });

  const score = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const eligible = score >= 60 && isCompliant;

  // Recommend a tier based on available data
  let recommendedTier = "standard";
  if (data.poolId) {
    try {
      const r = await db.execute(sql`SELECT volume_gallons FROM pools WHERE id = ${data.poolId} LIMIT 1`);
      const vol = (r.rows[0] as any)?.volume_gallons ?? 0;
      if (vol > 40000) recommendedTier = "estate";
      else if (vol > 25000) recommendedTier = "premium";
    } catch { /* */ }
  }

  // Save eligibility check
  try {
    await db.execute(sql`
      INSERT INTO eligibility_checks (user_uid, pool_id, score, checks, eligible, recommended_tier)
      VALUES (${auth.uid}, ${data.poolId ?? null}, ${score}, ${JSON.stringify(checks)}::jsonb, ${eligible}, ${recommendedTier})
    `);
  } catch { /* non-fatal */ }

  const roadmap = checks.filter(c => !c.passed).map(c => c.detail);

  return NextResponse.json({ eligible, score, checks, roadmap, recommendedTier });
}
