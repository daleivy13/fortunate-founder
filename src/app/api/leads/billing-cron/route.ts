import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { leadPurchases } from "@/backend/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Escalation: $5/mo base, +$2/mo per active month, capped at $25/mo
function nextFeeCents(monthsActive: number): number {
  const fee = 500 + (monthsActive + 1) * 200;
  return Math.min(fee, 2500);
}

// Called by a cron scheduler (e.g., Vercel Cron, Railway, or external cron hitting this endpoint)
// Secure with CRON_SECRET header
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const now = new Date();

  // Find recurring purchases due for billing escalation
  const due = await db
    .select()
    .from(leadPurchases)
    .where(
      and(
        eq(leadPurchases.isRecurring, true),
        isNotNull(leadPurchases.stripeSubId),
        lt(leadPurchases.nextBillingAt, now),
      )
    );

  let updated = 0;
  let errors  = 0;

  for (const purchase of due) {
    try {
      const newMonths = (purchase.monthsActive ?? 0) + 1;
      const newFee    = nextFeeCents(newMonths);
      const nextDate  = new Date(now);
      nextDate.setMonth(nextDate.getMonth() + 1);

      // Update the Stripe subscription price
      const sub = await stripe.subscriptions.retrieve(purchase.stripeSubId!);
      const itemId = sub.items.data[0]?.id;
      if (itemId) {
        // Create a new price for the updated amount
        const newPrice = await stripe.prices.create({
          currency:   "usd",
          unit_amount: newFee,
          recurring:  { interval: "month" },
          product:    sub.items.data[0].price.product as string,
        });
        await stripe.subscriptions.update(purchase.stripeSubId!, {
          items: [{ id: itemId, price: newPrice.id }],
          proration_behavior: "none",
        });
      }

      await db.update(leadPurchases)
        .set({
          monthsActive:    newMonths,
          monthlyFeeCents: newFee,
          nextBillingAt:   nextDate,
        })
        .where(eq(leadPurchases.id, purchase.id));

      updated++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed: due.length, updated, errors });
}
