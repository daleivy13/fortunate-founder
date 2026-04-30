import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

export interface FraudFlag {
  type:        string;
  severity:    "low" | "medium" | "high";
  description: string;
}

export interface FraudCheckResult {
  flags:    FraudFlag[];
  score:    number; // 0–100; higher = more suspicious
  decision: "clean" | "review" | "reject";
}

// Check if the same tech submitted another report at a different pool within impossibly short time
export async function checkDuplicateVisit(
  techId:    string,
  poolId:    number,
  visitedAt: Date,
  minGapMinutes = 20
): Promise<FraudFlag | null> {
  try {
    const res = await db.execute(sql`
      SELECT pool_id, completed_at
      FROM service_reports
      WHERE tech_id = ${techId}
        AND pool_id != ${poolId}
        AND ABS(EXTRACT(EPOCH FROM (completed_at - ${visitedAt.toISOString()}::timestamptz)) / 60) < ${minGapMinutes}
      LIMIT 1
    `);
    if (res.rows.length > 0) {
      return {
        type:     "duplicate_visit",
        severity: "high",
        description: `Tech submitted another service report within ${minGapMinutes} min at a different pool (pool #${(res.rows[0] as any).pool_id}).`,
      };
    }
  } catch { /* non-fatal */ }
  return null;
}

// Check if service duration is suspiciously short
export function checkServiceDuration(
  startedAt:  Date,
  completedAt:Date,
  minMinutes = 10
): FraudFlag | null {
  const minutes = (completedAt.getTime() - startedAt.getTime()) / 60000;
  if (minutes < minMinutes) {
    return {
      type:     "short_duration",
      severity: minutes < 3 ? "high" : "medium",
      description: `Service completed in ${Math.round(minutes)} min — minimum expected is ${minMinutes} min.`,
    };
  }
  return null;
}

// Check if tech GPS never matched pool location during service window
export function checkGpsPresence(wasAtLocation: boolean): FraudFlag | null {
  if (!wasAtLocation) {
    return {
      type:     "gps_mismatch",
      severity: "high",
      description: "Tech's GPS location did not match pool address during reported service window.",
    };
  }
  return null;
}

// Check if photo is too old to be from this visit
export function checkPhotoAge(minutesAgo: number | null, maxMinutes = 30): FraudFlag | null {
  if (minutesAgo === null) {
    return { type: "no_photo_timestamp", severity: "low", description: "Photo has no timestamp metadata." };
  }
  if (minutesAgo > maxMinutes) {
    return {
      type:     "stale_photo",
      severity: minutesAgo > 120 ? "high" : "medium",
      description: `Photo was taken ${minutesAgo} min ago — may not be from this visit (max ${maxMinutes} min).`,
    };
  }
  return null;
}

export function aggregateFraudResult(flags: (FraudFlag | null)[]): FraudCheckResult {
  const active = flags.filter(Boolean) as FraudFlag[];
  const score  = active.reduce((sum, f) => sum + (f.severity === "high" ? 40 : f.severity === "medium" ? 20 : 10), 0);
  const decision: FraudCheckResult["decision"] =
    score >= 60 ? "reject" : score >= 30 ? "review" : "clean";
  return { flags: active, score: Math.min(score, 100), decision };
}
