import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/backend/db";
import { serviceLeads, leadPurchases } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Pricing: $5/mo base, +$2/mo per active month, capped at $25/mo
function monthlyFeeCents(monthsActive: number): number {
  const fee = 500 + monthsActive * 200;
  return Math.min(fee, 2500);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const leadId = parseInt(params.id);
  const body = await req.json();
  const companyId: number = body.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  // Verify the pro has unlocked this lead first
  const [purchase] = await db
    .select()
    .from(leadPurchases)
    .where(and(eq(leadPurchases.leadId, leadId), eq(leadPurchases.proCompanyId, companyId)));

  if (!purchase) {
    return NextResponse.json({ error: "You must unlock this lead before marking it recurring" }, { status: 403 });
  }
  if (purchase.isRecurring) {
    return NextResponse.json({ message: "Already marked as recurring", purchase });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  // Create a Stripe subscription at the starting rate ($5/mo)
  const initialFeeCents = monthlyFeeCents(0);
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency:   "usd",
        unit_amount: initialFeeCents,
        recurring:  { interval: "month" },
        product_data: {
          name: "PoolPal Lead — Recurring Client Fee",
          description: "Monthly fee for retained pool service client. Scales with relationship duration.",
        },
      },
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/leads?recurring=confirmed`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/leads`,
    metadata: {
      type:      "lead_recurring",
      leadId:    String(leadId),
      companyId: String(companyId),
      purchaseId: String(purchase.id),
    },
  });

  // Optimistically update — webhook will confirm stripeSubId once paid
  await db.update(leadPurchases)
    .set({
      isRecurring:     true,
      monthlyFeeCents: initialFeeCents,
      nextBillingAt:   nextBilling,
    })
    .where(eq(leadPurchases.id, purchase.id));

  return NextResponse.json({ checkoutUrl: session.url });
}
