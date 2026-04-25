import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, chemistryReadings, serviceReports } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const id = parseInt(params.id);

    const [pool] = await db.select().from(pools).where(eq(pools.id, id));
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const readings = await db
      .select()
      .from(chemistryReadings)
      .where(eq(chemistryReadings.poolId, id))
      .orderBy(desc(chemistryReadings.recordedAt))
      .limit(24); // 24 readings for trend charts (~6 months weekly)

    const reports = await db
      .select()
      .from(serviceReports)
      .where(eq(serviceReports.poolId, id))
      .orderBy(desc(serviceReports.servicedAt))
      .limit(20);

    return NextResponse.json({ pool, readings, reports });
  } catch (err: any) {
    console.error("[api/pools/[id] GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const id = parseInt(params.id);
    const body = await req.json();

    const [updated] = await db
      .update(pools)
      .set(body)
      .where(eq(pools.id, id))
      .returning();

    return NextResponse.json({ pool: updated });
  } catch (err: any) {
    console.error("[api/pools/[id] PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const id = parseInt(params.id);
    await db.update(pools).set({ isActive: false }).where(eq(pools.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/pools/[id] DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
