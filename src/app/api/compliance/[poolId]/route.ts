import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { calculatePoolCompliance, updatePoolCompliance } from "@/lib/compliance/calculator";
import { getEquipmentExclusions } from "@/lib/compliance/penalties";

export async function GET(req: NextRequest, { params }: { params: { poolId: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(params.poolId);
  if (!poolId) return NextResponse.json({ error: "Invalid poolId" }, { status: 400 });

  const status = await calculatePoolCompliance(poolId, db, sql);

  // Compute equipment exclusions if in warning
  let equipmentExclusions: string[] = [];
  if (status.currentPenalty?.level === "exclusions_active" || status.currentPenalty?.level === "suspended") {
    if (status.worstParameter && status.lastReading) {
      const dir = status.worstStatus === "warning_low" ? "low" : "high";
      equipmentExclusions = getEquipmentExclusions(status.worstParameter as any, dir);
    }
  }

  return NextResponse.json({ ...status, equipmentExclusions });
}

export async function POST(req: NextRequest, { params }: { params: { poolId: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(params.poolId);
  const body   = await req.json();

  if (body.action === "vacation_mode") {
    const { until } = body;
    if (!until) return NextResponse.json({ error: "until date required" }, { status: 400 });

    const untilDate = new Date(until);
    if (isNaN(untilDate.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    // Max 30 days vacation mode
    const maxVacation = new Date(Date.now() + 30 * 86400000);
    if (untilDate > maxVacation) return NextResponse.json({ error: "Vacation mode max 30 days" }, { status: 400 });

    await db.execute(sql`
      INSERT INTO compliance_status (pool_id, status, vacation_mode_until, last_calculated_at)
      VALUES (${poolId}, 'compliant', ${untilDate.toISOString().slice(0,10)}, NOW())
      ON CONFLICT (pool_id) DO UPDATE SET
        vacation_mode_until = EXCLUDED.vacation_mode_until
    `).catch(() => {});

    return NextResponse.json({ success: true, vacationModeUntil: until });
  }

  if (body.action === "reset_after_recovery") {
    await db.execute(sql`
      UPDATE compliance_status SET
        consecutive_warning_days = 0,
        status = 'compliant',
        suspended_at = NULL,
        suspension_reason = NULL
      WHERE pool_id = ${poolId}
    `).catch(() => {});
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
