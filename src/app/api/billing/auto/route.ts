import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const rows = await db.execute(sql`
    SELECT p.*, COUNT(i.id) AS invoice_count,
      MAX(i.created_at) AS last_billed_at
    FROM pools p
    LEFT JOIN invoices i ON i.pool_id = p.id
    WHERE p.company_id = ${parseInt(companyId)}
      AND p.auto_billing = true
    GROUP BY p.id
    ORDER BY p.billing_day ASC
  `);

  const today = new Date().getDate();

  const pools = rows.rows.map((p: any) => ({
    ...p,
    billingDay:         p.billing_day,
    autoBilling:        p.auto_billing,
    stripeCustomerId:   p.stripe_customer_id,
    hasPaymentMethod:   !!p.stripe_customer_id,
    nextBillingDate: (() => {
      const now = new Date();
      const day = p.billing_day ?? 1;
      const next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      return next.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    })(),
    isBillingToday: p.billing_day === today,
  }));

  return NextResponse.json({ pools, today });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { action, poolId, companyId, billingDay, autoInvoice, autoBilling } = body;

  if (action === "setup") {
    // Create Stripe customer + save stripe_customer_id
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

    const poolRows = await db.execute(sql`SELECT * FROM pools WHERE id = ${parseInt(poolId)} LIMIT 1`);
    const pool = poolRows.rows[0] as any;
    if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

    let customerId = pool.stripe_customer_id;
    if (!customerId && pool.client_email) {
      const customer = await stripe.customers.create({
        email: pool.client_email,
        name:  pool.client_name,
        metadata: { poolId: String(pool.id), companyId: String(pool.company_id) },
      });
      customerId = customer.id;
      await db.execute(sql`UPDATE pools SET stripe_customer_id = ${customerId} WHERE id = ${pool.id}`);
    }

    // Generate Stripe SetupIntent link
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId ?? undefined,
      customer_email: !customerId ? pool.client_email : undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pools/${pool.id}?billing=setup_complete`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pools/${pool.id}`,
      metadata: { poolId: String(pool.id) },
    });

    return NextResponse.json({ setupUrl: session.url, customerId });
  }

  if (action === "update_billing") {
    const billingEnabled = autoBilling ?? autoInvoice ?? false;
    await db.execute(sql`
      UPDATE pools SET
        auto_billing = ${billingEnabled},
        billing_day  = ${billingDay ?? 1}
      WHERE id = ${parseInt(poolId)}
    `);
    return NextResponse.json({ success: true });
  }

  if (action === "run") {
    // Find all pools where billing_day = today
    const today = new Date().getDate();
    const rows = await db.execute(sql`
      SELECT * FROM pools
      WHERE auto_billing = true AND billing_day = ${today}
        ${companyId ? sql`AND company_id = ${parseInt(companyId)}` : sql``}
    `);

    const billed: any[] = [];
    const failed: any[] = [];

    for (const pool of rows.rows) {
      try {
        // Create invoice record
        const lineItems = JSON.stringify([{ description: "Monthly pool service", amount: pool.monthly_rate ?? 0, quantity: 1 }]);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const invResult = await db.execute(sql`
          INSERT INTO invoices (company_id, pool_id, client_name, client_email, amount, status, due_date, line_items, notes)
          VALUES (
            ${pool.company_id}, ${pool.id}, ${pool.client_name}, ${pool.client_email},
            ${pool.monthly_rate ?? 0}, 'sent',
            ${dueDate.toISOString().slice(0,10)},
            ${lineItems},
            'Auto-generated monthly billing'
          )
          RETURNING id
        `);

        billed.push({ pool: pool.name, invoiceId: (invResult.rows[0] as any).id });
      } catch (e: any) {
        failed.push({ pool: pool.name, error: e.message });
      }
    }

    return NextResponse.json({ billed, failed, billedCount: billed.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
