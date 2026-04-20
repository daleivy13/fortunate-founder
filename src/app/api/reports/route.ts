import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { serviceReports, chemistryReadings, pools } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const poolId    = searchParams.get("poolId");

    let rows;
    if (poolId) {
      rows = await db
        .select()
        .from(serviceReports)
        .where(eq(serviceReports.poolId, parseInt(poolId)))
        .orderBy(desc(serviceReports.servicedAt));
    } else {
      rows = await db
        .select({ report: serviceReports, pool: pools })
        .from(serviceReports)
        .innerJoin(pools, eq(serviceReports.poolId, pools.id))
        .where(eq(pools.companyId, parseInt(companyId!)))
        .orderBy(desc(serviceReports.servicedAt))
        .limit(50);
    }

    return NextResponse.json({ reports: rows });
  } catch (err: any) {
    console.error("[api/reports GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poolId, techId, routeId,
      freeChlorine, ph, totalAlkalinity, calciumHardness, cyanuricAcid,
      waterTemp, skimmed, brushed, vacuumed, filterCleaned,
      chemicalsAdded, equipmentChecked, chemicalsUsed,
      issuesFound, techNotes, photos,
    } = body;

    if (!poolId) {
      return NextResponse.json({ error: "poolId is required" }, { status: 400 });
    }

    // Use a transaction so chemistry reading and report are created atomically
    const report = await db.transaction(async (tx) => {
      let chemReadingId: number | null = null;

      if (freeChlorine || ph) {
        const [reading] = await tx
          .insert(chemistryReadings)
          .values({
            poolId:          parseInt(poolId),
            techId:          techId || null,
            freeChlorine:    freeChlorine    ? parseFloat(freeChlorine)    : null,
            ph:              ph              ? parseFloat(ph)              : null,
            totalAlkalinity: totalAlkalinity ? parseFloat(totalAlkalinity) : null,
            calciumHardness: calciumHardness ? parseFloat(calciumHardness) : null,
            cyanuricAcid:    cyanuricAcid    ? parseFloat(cyanuricAcid)    : null,
            waterTemp:       waterTemp       ? parseFloat(waterTemp)       : null,
          })
          .returning();
        chemReadingId = reading.id;
      }

      const [created] = await tx
        .insert(serviceReports)
        .values({
          poolId:          parseInt(poolId),
          techId:          techId  || null,
          routeId:         routeId ? parseInt(routeId) : null,
          chemReadingId,
          status:          "complete",
          skimmed:         skimmed         ?? false,
          brushed:         brushed         ?? false,
          vacuumed:        vacuumed        ?? false,
          filterCleaned:   filterCleaned   ?? false,
          chemicalsAdded:  chemicalsAdded  ?? false,
          equipmentChecked: equipmentChecked ?? false,
          chemicalsUsed:   chemicalsUsed ? JSON.stringify(chemicalsUsed) : null,
          issuesFound:     issuesFound  || null,
          techNotes:       techNotes    || null,
          photos:          photos       ? JSON.stringify(photos)       : null,
        })
        .returning();

      return created;
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err: any) {
    console.error("[api/reports POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
