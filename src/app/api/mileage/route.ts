import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { mileageLogs } from "@/backend/db/schema";
import { eq, desc, sum } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const logs = await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.userId, userId))
      .orderBy(desc(mileageLogs.date))
      .limit(100);

    const [totals] = await db
      .select({ total: sum(mileageLogs.miles) })
      .from(mileageLogs)
      .where(eq(mileageLogs.userId, userId));

    return NextResponse.json({ logs, totalMiles: totals?.total ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { userId, routeId, date, miles, purpose } = body;
    const IRS_RATE = 0.67;

    const [log] = await db
      .insert(mileageLogs)
      .values({
        userId,
        routeId: routeId ? parseInt(routeId) : null,
        date,
        miles: parseFloat(miles),
        purpose: purpose || "Pool service route",
        deductionRate: IRS_RATE,
        taxDeduction: parseFloat(miles) * IRS_RATE,
      })
      .returning();

    return NextResponse.json({ log }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
