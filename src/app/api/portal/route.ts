import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/backend/db";
import { pools, serviceReports, invoices, companies } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

const PORTAL_SECRET = process.env.NEXTAUTH_SECRET ?? "dev-portal-secret-change-in-production";

// Token format: base64(JSON payload) + "." + base64(HMAC signature)
// Payload: { poolId, companyId, email, exp }

export function signPortalToken(payload: { poolId: number; companyId: number; email?: string }): string {
  const data = { ...payload, exp: Date.now() + 90 * 24 * 60 * 60 * 1000 }; // 90-day expiry
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", PORTAL_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyPortalToken(token: string): { poolId: number; companyId: number; email?: string; exp: number } | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expected = createHmac("sha256", PORTAL_SECRET).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// POST /api/portal — generate a portal token for a pool
export async function POST(req: NextRequest) {
  try {
    const { poolId, companyId, email } = await req.json();
    if (!poolId || !companyId) {
      return NextResponse.json({ error: "poolId and companyId required" }, { status: 400 });
    }
    const token = signPortalToken({ poolId: parseInt(poolId), companyId: parseInt(companyId), email });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${appUrl}/customers/portal?token=${token}`;
    return NextResponse.json({ token, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const payload = verifyPortalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  try {
    const { poolId, companyId } = payload;

    // Fetch pool
    const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
    if (!pool || pool.companyId !== companyId) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Fetch company
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));

    // Fetch latest reports (last 10)
    const reports = await db
      .select()
      .from(serviceReports)
      .where(eq(serviceReports.poolId, poolId))
      .orderBy(desc(serviceReports.servicedAt))
      .limit(10);

    // Fetch invoices for this pool
    const poolInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.poolId, poolId))
      .orderBy(desc(invoices.createdAt))
      .limit(20);

    return NextResponse.json({
      pool:     { id: pool.id, name: pool.name, address: pool.address, type: pool.type },
      company:  { name: company?.name ?? "Your Pool Service" },
      reports:  reports.map((r) => ({
        id:             r.id,
        servicedAt:     r.servicedAt,
        status:         r.status,
        skimmed:        r.skimmed,
        brushed:        r.brushed,
        vacuumed:       r.vacuumed,
        filterCleaned:  r.filterCleaned,
        chemicalsAdded: r.chemicalsAdded,
        techNotes:      r.techNotes,
        issuesFound:    r.issuesFound,
      })),
      invoices: poolInvoices.map((inv) => ({
        id:        inv.id,
        amount:    inv.amount,
        status:    inv.status,
        dueDate:   inv.dueDate,
        lineItems: inv.lineItems,
      })),
    });
  } catch (err: any) {
    console.error("[api/portal GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
