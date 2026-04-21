import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { routes, routeStops, pools } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = parseInt(searchParams.get("companyId") ?? "");
  if (!companyId || isNaN(companyId)) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(routes)
      .where(eq(routes.companyId, companyId))
      .orderBy(desc(routes.scheduledDate))
      .limit(30);

    return NextResponse.json({ routes: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { companyId, techId, name, scheduledDate, stops } = body;

    if (!companyId || !scheduledDate) {
      return NextResponse.json({ error: "companyId and scheduledDate required" }, { status: 400 });
    }

    const [route] = await db
      .insert(routes)
      .values({
        companyId: parseInt(companyId),
        techId:    techId || null,
        name:      name   || `Route ${scheduledDate}`,
        scheduledDate,
        status: "scheduled",
      })
      .returning();

    // Insert stops if provided
    if (Array.isArray(stops) && stops.length > 0) {
      await db.insert(routeStops).values(
        stops.map((s: any, i: number) => ({
          routeId: route.id,
          poolId:  parseInt(s.poolId),
          order:   s.order ?? i + 1,
          status:  "pending",
        }))
      );
    }

    return NextResponse.json({ route }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
