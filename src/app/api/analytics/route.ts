import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, serviceReports, invoices, mileageLogs } from "@/backend/db/schema";
import { eq, sum, count, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const cid = parseInt(companyId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Pool count
    const [poolCount] = await db
      .select({ count: count() })
      .from(pools)
      .where(eq(pools.companyId, cid));

    // Revenue this month (paid invoices)
    const [revenue] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.companyId, cid));

    // Report count this month
    const [reportCount] = await db
      .select({ count: count() })
      .from(serviceReports)
      .innerJoin(pools, eq(serviceReports.poolId, pools.id))
      .where(eq(pools.companyId, cid));

    return NextResponse.json({
      poolCount: poolCount.count ?? 0,
      totalRevenue: revenue.total ?? 0,
      reportCount: reportCount.count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
