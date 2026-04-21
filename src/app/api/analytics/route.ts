import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, serviceReports, invoices } from "@/backend/db/schema";
import { eq, sum, count, gte, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const cid = parseInt(companyId);
    if (isNaN(cid)) return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [poolCount] = await db
      .select({ count: count() })
      .from(pools)
      .where(eq(pools.companyId, cid));

    const [allRevenue] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(and(eq(invoices.companyId, cid), eq(invoices.status, "paid")));

    const [monthlyRev] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(and(eq(invoices.companyId, cid), eq(invoices.status, "paid"), gte(invoices.createdAt, monthStart)));

    const [outstanding] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(and(eq(invoices.companyId, cid), eq(invoices.status, "sent")));

    const [allReports] = await db
      .select({ count: count() })
      .from(serviceReports)
      .innerJoin(pools, eq(serviceReports.poolId, pools.id))
      .where(eq(pools.companyId, cid));

    const [monthlyReports] = await db
      .select({ count: count() })
      .from(serviceReports)
      .innerJoin(pools, eq(serviceReports.poolId, pools.id))
      .where(and(eq(pools.companyId, cid), gte(serviceReports.servicedAt, monthStart)));

    return NextResponse.json({
      poolCount:        poolCount.count          ?? 0,
      totalRevenue:     Number(allRevenue.total  ?? 0),
      reportCount:      allReports.count         ?? 0,
      monthlyRevenue:   Number(monthlyRev.total  ?? 0),
      outstanding:      Number(outstanding.total ?? 0),
      reportsThisMonth: monthlyReports.count     ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
