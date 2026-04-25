import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { serviceReports, chemistryReadings, pools, chemicalInventory } from "@/backend/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody, CreateReportSchema } from "@/lib/validation";
import { cacheDel, CacheKeys } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = parseInt(searchParams.get("companyId") ?? "");
  const poolId    = parseInt(searchParams.get("poolId")    ?? "");

  try {
    let rows;
    if (!isNaN(poolId) && poolId) {
      rows = await db
        .select()
        .from(serviceReports)
        .where(eq(serviceReports.poolId, poolId))
        .orderBy(desc(serviceReports.servicedAt))
        .limit(50);
    } else if (!isNaN(companyId) && companyId) {
      rows = await db
        .select({ report: serviceReports, pool: pools })
        .from(serviceReports)
        .innerJoin(pools, eq(serviceReports.poolId, pools.id))
        .where(eq(pools.companyId, companyId))
        .orderBy(desc(serviceReports.servicedAt))
        .limit(50);
    } else {
      return NextResponse.json({ error: "companyId or poolId required" }, { status: 400 });
    }

    return NextResponse.json({ reports: rows });
  } catch (err: any) {
    console.error("[api/reports GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { data, error: valErr } = validateBody(CreateReportSchema, body);
  if (valErr) return valErr;

  try {
    const report = await db.transaction(async (tx) => {
      let chemReadingId: number | null = null;

      if (data.freeChlorine != null || data.ph != null) {
        const [reading] = await tx
          .insert(chemistryReadings)
          .values({
            poolId:          data.poolId,
            techId:          data.techId  || null,
            freeChlorine:    data.freeChlorine    ?? null,
            ph:              data.ph               ?? null,
            totalAlkalinity: data.totalAlkalinity  ?? null,
            calciumHardness: data.calciumHardness  ?? null,
            cyanuricAcid:    data.cyanuricAcid     ?? null,
            waterTemp:       data.waterTemp        ?? null,
          })
          .returning();
        chemReadingId = reading.id;
      }

      const [created] = await tx
        .insert(serviceReports)
        .values({
          poolId:           data.poolId,
          techId:           data.techId   || null,
          routeId:          data.routeId  ?? null,
          chemReadingId,
          status:           "complete",
          skimmed:          data.skimmed          ?? false,
          brushed:          data.brushed          ?? false,
          vacuumed:         data.vacuumed         ?? false,
          filterCleaned:    data.filterCleaned    ?? false,
          chemicalsAdded:   data.chemicalsAdded   ?? false,
          equipmentChecked: data.equipmentChecked ?? false,
          chemicalsUsed:    data.chemicalsUsed ? JSON.stringify(data.chemicalsUsed) : null,
          issuesFound:      data.issuesFound  || null,
          techNotes:        data.techNotes    || null,
          photos:           data.photos?.length ? JSON.stringify(data.photos) : null,
        })
        .returning();

      return created;
    });

    // Auto-deduct chemicals from inventory based on chemicalsUsed string
    if (body.chemicalsUsed && body.companyId) {
      const entries: string[] = typeof body.chemicalsUsed === "string"
        ? body.chemicalsUsed.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      for (const entry of entries) {
        // Format: "2fl oz Chlorine" or "1lbs Shock"
        const match = entry.match(/^([\d.]+)\s*(?:fl\s*oz|lbs?|gal|tabs?|cups?)\s+(.+)$/i);
        if (!match) continue;
        const qty  = parseFloat(match[1]);
        const name = match[2].trim();
        if (isNaN(qty) || !name) continue;
        try {
          const [item] = await db.select().from(chemicalInventory)
            .where(and(eq(chemicalInventory.companyId, body.companyId), ilike(chemicalInventory.name, `%${name}%`)))
            .limit(1);
          if (item) {
            const newQty = Math.max(0, (item.currentQty ?? 0) - qty);
            await db.update(chemicalInventory).set({ currentQty: newQty }).where(eq(chemicalInventory.id, item.id));
          }
        } catch { /* inventory deduct is best-effort */ }
      }
    }

    await cacheDel(CacheKeys.reports(body.companyId ?? 0));
    return NextResponse.json({ report }, { status: 201 });
  } catch (err: any) {
    console.error("[api/reports POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
