import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import Stripe from "stripe";

const Schema = z.object({
  quoteId:    z.number().int().positive(),
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

  let quote: any = null;
  try {
    const r = await db.execute(sql`SELECT * FROM insurance_quotes WHERE id = ${data.quoteId} AND user_uid = ${auth.uid} LIMIT 1`);
    quote = r.rows[0];
  } catch { /* */ }

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (new Date(quote.expires_at) < new Date()) {
    return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
  }

  const amount = Math.round(parseFloat(quote.monthly_price ?? quote.annual_price) * 100);
  const interval = quote.annual_price && !quote.monthly_price ? "year" : "month";

  // Create Stripe price on the fly (production would use pre-created price IDs)
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency:    "usd",
    recurring:   { interval },
    product_data:{ name: `PoolPal ${quote.tier.charAt(0).toUpperCase() + quote.tier.slice(1)} Insurance` },
  });

  const session = await stripe.checkout.sessions.create({
    mode:               "subscription",
    line_items:         [{ price: price.id, quantity: 1 }],
    success_url:        `${data.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:         data.cancelUrl,
    client_reference_id: String(data.quoteId),
    metadata:           { quoteId: String(data.quoteId), userUid: auth.uid, tier: quote.tier },
  });

  // Update quote with price ID
  await db.execute(sql`UPDATE insurance_quotes SET stripe_price_id = ${price.id}, status = 'checkout_started' WHERE id = ${data.quoteId}`).catch(() => {});

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
