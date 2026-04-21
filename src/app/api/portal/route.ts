import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/backend/db";
import { pools, serviceReports, invoices, companies, chemistryReadings } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" })
  : null;

const PORTAL_SECRET = process.env.NEXTAUTH_SECRET ?? "dev-portal-secret-change-in-production";

// Token format: base64(JSON payload) + "." + base64(HMAC signature)
// Payload: { poolId, companyId, email, exp }

function signPortalToken(payload: { poolId: number; companyId: number; email?: string }): string {
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

// POST /api/portal — generate a portal token (requires auth) OR create Stripe checkout (uses portal token)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // action=pay: public endpoint, authenticated via portal token
  if (body.action === "pay") {
    const payload = verifyPortalToken(body.token);
    if (!payload) return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 401 });

    if (!stripe) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

    const invoiceId = parseInt(body.invoiceId);
    if (isNaN(invoiceId)) return NextResponse.json({ error: "Invalid invoiceId" }, { status: 400 });

    try {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!inv || inv.status === "paid") return NextResponse.json({ error: "Invoice not found or already paid" }, { status: 404 });

      const lineItems = JSON.parse(inv.lineItems ?? "[]") as { desc: string; qty: number; rate: number }[];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: { name: item.desc },
            unit_amount: Math.round(item.rate * 100),
          },
          quantity: item.qty,
        })),
        success_url: `${appUrl}/customers/portal?token=${body.token}&paid=true`,
        cancel_url:  `${appUrl}/customers/portal?token=${body.token}`,
        customer_email: inv.clientEmail ?? undefined,
        metadata: { invoiceId: String(invoiceId) },
      });

      return NextResponse.json({ paymentUrl: session.url });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Default: generate portal token (requires company auth)
  const { requireAuth } = await import("@/lib/auth");
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { poolId, companyId, email } = body;
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

    // Fetch latest chemistry reading
    const [latestChem] = await db
      .select()
      .from(chemistryReadings)
      .where(eq(chemistryReadings.poolId, poolId))
      .orderBy(desc(chemistryReadings.recordedAt))
      .limit(1);

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
      latestChem: latestChem ? {
        freeChlorine: latestChem.freeChlorine,
        ph:           latestChem.ph,
        recordedAt:   latestChem.recordedAt,
      } : null,
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
        id:                    inv.id,
        amount:                inv.amount,
        status:                inv.status,
        dueDate:               inv.dueDate,
        lineItems:             inv.lineItems,
        stripePaymentIntentId: inv.stripePaymentIntentId,
      })),
    });
  } catch (err: any) {
    console.error("[api/portal GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
