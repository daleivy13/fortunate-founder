import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { createHash } from "crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function buildChain(events: any[]): any[] {
  let prevHash: string | null = null;
  return events.map((evt) => {
    const payload = JSON.stringify({ id: evt.id, type: evt.eventType, ts: evt.createdAt, desc: evt.description });
    const hash = sha256((prevHash ?? "") + payload);
    const result = { ...evt, hash, prevHash };
    prevHash = hash;
    return result;
  });
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const poolId    = searchParams.get("poolId");

  if (!companyId && !poolId) {
    return NextResponse.json({ error: "companyId or poolId required" }, { status: 400 });
  }

  const events: any[] = [];

  try {
    // Service reports
    const reportFilter = poolId
      ? sql`sr.pool_id = ${parseInt(poolId)}`
      : sql`p.company_id = ${parseInt(companyId!)}`;

    const reports = await db.execute(sql`
      SELECT sr.id, sr.serviced_at, sr.tech_notes, sr.status, sr.pool_id,
             cr.free_chlorine, cr.ph, cr.total_alkalinity,
             p.name AS pool_name
      FROM service_reports sr
      JOIN pools p ON sr.pool_id = p.id
      LEFT JOIN chemistry_readings cr ON sr.chem_reading_id = cr.id
      WHERE ${reportFilter}
      ORDER BY sr.serviced_at DESC
      LIMIT 100
    `);

    for (const r of reports.rows as any[]) {
      const chemParts = [
        r.free_chlorine != null ? `FC ${r.free_chlorine}` : null,
        r.ph            != null ? `pH ${r.ph}` : null,
        r.total_alkalinity != null ? `Alk ${r.total_alkalinity}` : null,
      ].filter(Boolean).join(", ");

      events.push({
        id:          `report-${r.id}`,
        eventType:   "service_report",
        description: r.tech_notes ?? `Service completed${chemParts ? ` — ${chemParts}` : ""}`,
        createdAt:   r.serviced_at,
        poolId:      r.pool_id,
        metadata:    { poolName: r.pool_name, status: r.status },
      });
    }

    // Chemistry readings (if not already covered by reports)
    const chemFilter = poolId
      ? sql`cr.pool_id = ${parseInt(poolId)}`
      : sql`p.company_id = ${parseInt(companyId!)}`;

    const readings = await db.execute(sql`
      SELECT cr.id, cr.created_at, cr.free_chlorine, cr.ph, cr.total_alkalinity,
             cr.pool_id, p.name AS pool_name
      FROM chemistry_readings cr
      JOIN pools p ON cr.pool_id = p.id
      WHERE ${chemFilter}
      ORDER BY cr.created_at DESC
      LIMIT 50
    `);

    for (const r of readings.rows as any[]) {
      events.push({
        id:          `chem-${r.id}`,
        eventType:   "chemistry_reading",
        description: `Chemistry: FC ${r.free_chlorine ?? "—"}, pH ${r.ph ?? "—"}, Alk ${r.total_alkalinity ?? "—"}`,
        createdAt:   r.created_at,
        poolId:      r.pool_id,
        metadata:    { poolName: r.pool_name },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  // Sort all events oldest-first to build correct hash chain, then reverse for display
  events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const chained = buildChain(events).reverse();

  return NextResponse.json({ events: chained });
}
