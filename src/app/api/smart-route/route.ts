import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, routeStops, routes, chemistryReadings } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

// Fetches weather + tasks + last chemistry for each stop and builds a smart brief
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId   = searchParams.get("routeId");
    const companyId = searchParams.get("companyId");

    if (!routeId) return NextResponse.json({ error: "routeId required" }, { status: 400 });

    // Get route stops with pool details
    const stops = await db
      .select({ stop: routeStops, pool: pools })
      .from(routeStops)
      .innerJoin(pools, eq(routeStops.poolId, pools.id))
      .where(eq(routeStops.routeId, parseInt(routeId)))
      .orderBy(routeStops.order);

    // For each stop, fetch weather intelligence and tasks in parallel
    const enrichedStops = await Promise.all(
      stops.map(async ({ stop, pool }) => {
        // Fetch weather if we have coordinates
        let intelligence = null;
        if (pool.lat && pool.lng) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            const weatherRes = await fetch(
              `${baseUrl}/api/weather?lat=${pool.lat}&lng=${pool.lng}&vol=${pool.volumeGallons ?? 15000}`,
              { next: { revalidate: 1800 } }
            );
            if (weatherRes.ok) {
              const data = await weatherRes.json();
              intelligence = data.intelligence;
            }
          } catch {}
        }

        // Fetch overdue/due tasks
        let dueTasks: any[] = [];
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const tasksRes = await fetch(`${baseUrl}/api/pools/tasks?poolId=${pool.id}`, { next: { revalidate: 300 } });
          if (tasksRes.ok) {
            const data = await tasksRes.json();
            dueTasks = [...(data.overdue ?? []), ...(data.due ?? [])];
          }
        } catch {}

        // Get latest chemistry reading
        let lastReading = null;
        try {
          const [reading] = await db
            .select()
            .from(chemistryReadings)
            .where(eq(chemistryReadings.poolId, pool.id))
            .orderBy(desc(chemistryReadings.recordedAt))
            .limit(1);
          lastReading = reading ?? null;
        } catch {}

        // Build stop brief
        const brief = buildStopBrief(pool, lastReading, intelligence, dueTasks);

        return {
          stop,
          pool,
          intelligence,
          lastReading,
          dueTasks,
          brief,
        };
      })
    );

    return NextResponse.json({ stops: enrichedStops });
  } catch (err: any) {
    console.error("[api/smart-route]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildStopBrief(
  pool: any,
  lastReading: any,
  intelligence: any,
  dueTasks: any[]
): { priority: "critical" | "high" | "normal"; summary: string; actions: string[]; warnings: string[] } {
  const actions: string[]  = [];
  const warnings: string[] = [];
  let priority: "critical" | "high" | "normal" = "normal";

  // Chemistry actions
  if (lastReading) {
    if (lastReading.freeChlorine < 1.0) {
      actions.push(`🔴 SHOCK: Cl critically low (${lastReading.freeChlorine} ppm) — shock treatment required`);
      priority = "critical";
    } else if (lastReading.freeChlorine < 2.0) {
      actions.push(`🟡 Add chlorine: Cl at ${lastReading.freeChlorine} ppm — bring to 3 ppm`);
      if (priority === "normal") priority = "high";
    }
    if (lastReading.ph > 7.8) {
      actions.push(`🟡 pH HIGH (${lastReading.ph}): Add muriatic acid`);
      if (priority === "normal") priority = "high";
    } else if (lastReading.ph < 7.0) {
      actions.push(`🟡 pH LOW (${lastReading.ph}): Add soda ash`);
      if (priority === "normal") priority = "high";
    }
    if (lastReading.totalAlkalinity < 70) {
      actions.push(`🟡 Low alkalinity (${lastReading.totalAlkalinity} ppm): Add sodium bicarbonate`);
    }
  } else {
    actions.push("📊 Full chemistry test required — no recent readings on file");
  }

  // Weather adjustments
  if (intelligence) {
    const riskLevel = intelligence.riskLevel;
    if (riskLevel === "critical" || riskLevel === "high") {
      if (priority !== "critical") priority = "high";
    }
    intelligence.procedureAlerts?.forEach((alert: any) => {
      if (alert.urgency === "critical") {
        warnings.push(`${alert.icon} ${alert.type}: ${alert.message}`);
        priority = "critical";
      } else {
        warnings.push(`${alert.icon} ${alert.message}`);
      }
    });
    if (intelligence.smartDosageMultiplier !== 1.0) {
      const pct = Math.round((intelligence.smartDosageMultiplier - 1) * 100);
      warnings.push(`🌡️ Weather adjustment: ${pct > 0 ? "+" : ""}${pct}% on chemical doses today`);
    }
  }

  // Due tasks
  dueTasks.slice(0, 4).forEach((task: any) => {
    const flag = task.status === "overdue" ? "🔴" : "🟡";
    actions.push(`${flag} ${task.status === "overdue" ? "OVERDUE" : "DUE"}: ${task.name}`);
  });

  // Pool notes
  if (pool.notes) {
    actions.push(`📝 Note: ${pool.notes}`);
  }

  const summary = priority === "critical"
    ? "Critical attention required"
    : priority === "high"
    ? `${actions.length} items need attention`
    : actions.length > 0
    ? "Standard service + tasks"
    : "Standard service";

  return { priority, summary, actions, warnings };
}
