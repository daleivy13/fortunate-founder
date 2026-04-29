import { classifyAllReadings } from "./classifier";
import { getPenaltyForDay, getNextReward } from "./penalties";

export interface ComplianceStatus {
  poolId:                 number;
  status:                 "compliant" | "warning" | "suspended";
  consecutiveWarningDays: number;
  consecutiveCompliantDays: number;
  consecutiveOptimalDays: number;
  currentPenalty:         ReturnType<typeof getPenaltyForDay> | null;
  nextReward:             ReturnType<typeof getNextReward>;
  lastReading:            { freeChlorine?: number; ph?: number; alkalinity?: number } | null;
  lastReadingAt:          string | null;
  worstParameter:         string | null;
  worstStatus:            string | null;
}

export async function calculatePoolCompliance(poolId: number, db: any, sql: any): Promise<ComplianceStatus> {
  // Pull last 30 days of readings
  const readingRows = await db.execute(sql`
    SELECT free_chlorine, ph, total_alkalinity, recorded_at
    FROM chemistry_readings
    WHERE pool_id = ${poolId}
      AND recorded_at >= NOW() - INTERVAL '30 days'
    ORDER BY recorded_at DESC
  `).catch(() => ({ rows: [] }));

  const readings = readingRows.rows as any[];

  if (readings.length === 0) {
    return {
      poolId,
      status:                 "compliant",
      consecutiveWarningDays: 0,
      consecutiveCompliantDays: 0,
      consecutiveOptimalDays: 0,
      currentPenalty:         null,
      nextReward:             getNextReward(0),
      lastReading:            null,
      lastReadingAt:          null,
      worstParameter:         null,
      worstStatus:            null,
    };
  }

  const latest = readings[0];
  const lastReading = {
    freeChlorine: latest.free_chlorine != null ? parseFloat(latest.free_chlorine) : undefined,
    ph:           latest.ph            != null ? parseFloat(latest.ph)            : undefined,
    alkalinity:   latest.total_alkalinity != null ? parseFloat(latest.total_alkalinity) : undefined,
  };

  const { worstStatus, details } = classifyAllReadings(lastReading);
  const worstDetail = details.find(d => d.status === worstStatus) ?? null;

  // Compute consecutive days in warning from DB (or estimate from readings)
  let existingStatus: any = null;
  try {
    const csRows = await db.execute(sql`SELECT * FROM compliance_status WHERE pool_id = ${poolId} LIMIT 1`);
    existingStatus = csRows.rows[0] as any ?? null;
  } catch {}

  let consecutiveWarningDays = existingStatus?.consecutive_warning_days ?? 0;
  let consecutiveCompliantDays = existingStatus?.consecutive_compliant_days ?? 0;
  let consecutiveOptimalDays = existingStatus?.consecutive_optimal_days ?? 0;

  // Update streaks based on today's reading
  const isWarning     = worstStatus === "warning_low" || worstStatus === "warning_high";
  const isOOC         = worstStatus === "out_of_compliance";
  const isCompliant   = worstStatus === "acceptable" || worstStatus === "optimal";
  const isOptimal     = worstStatus === "optimal";

  if (isWarning || isOOC) {
    consecutiveWarningDays  = consecutiveWarningDays + 1;
    consecutiveCompliantDays = 0;
    consecutiveOptimalDays   = 0;
  } else if (isCompliant) {
    consecutiveWarningDays = 0;
    consecutiveCompliantDays = consecutiveCompliantDays + 1;
    if (isOptimal) consecutiveOptimalDays = consecutiveOptimalDays + 1;
    else            consecutiveOptimalDays = 0;
  }

  let status: "compliant" | "warning" | "suspended" = "compliant";
  if (isOOC && consecutiveWarningDays >= 14) status = "suspended";
  else if (isWarning || isOOC)               status = "warning";

  const currentPenalty = status === "warning" || status === "suspended"
    ? getPenaltyForDay(consecutiveWarningDays)
    : null;

  return {
    poolId,
    status,
    consecutiveWarningDays,
    consecutiveCompliantDays,
    consecutiveOptimalDays,
    currentPenalty,
    nextReward: getNextReward(consecutiveOptimalDays),
    lastReading,
    lastReadingAt: latest.recorded_at,
    worstParameter: worstDetail?.parameter ?? null,
    worstStatus:    worstStatus,
  };
}

export async function updatePoolCompliance(poolId: number, db: any, sql: any): Promise<ComplianceStatus> {
  const status = await calculatePoolCompliance(poolId, db, sql);

  try {
    await db.execute(sql`
      INSERT INTO compliance_status (
        pool_id, status, consecutive_warning_days, consecutive_compliant_days,
        consecutive_optimal_days, last_calculated_at
      ) VALUES (
        ${poolId}, ${status.status}, ${status.consecutiveWarningDays},
        ${status.consecutiveCompliantDays}, ${status.consecutiveOptimalDays}, NOW()
      )
      ON CONFLICT (pool_id) DO UPDATE SET
        status                    = EXCLUDED.status,
        consecutive_warning_days  = EXCLUDED.consecutive_warning_days,
        consecutive_compliant_days = EXCLUDED.consecutive_compliant_days,
        consecutive_optimal_days  = EXCLUDED.consecutive_optimal_days,
        last_calculated_at        = NOW()
    `);

    await db.execute(sql`
      INSERT INTO compliance_events (pool_id, event_type, status_after)
      VALUES (${poolId}, 'daily_check', ${status.status})
    `);
  } catch {}

  return status;
}
