import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/backend/db";
import { companies, invoices } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan && session.mode === "subscription") {
        await db.update(companies).set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: "active",
          plan: plan as "small" | "medium" | "large",
        }).where(eq(companies.ownerId, userId));
      }
      if (session.mode === "payment") {
        const invoiceId = session.metadata?.invoiceId;
        if (invoiceId) {
          await db.update(invoices).set({ status: "paid", paidAt: new Date() })
            .where(eq(invoices.id, parseInt(invoiceId)));
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(companies).set({ subscriptionStatus: sub.status })
        .where(eq(companies.stripeSubscriptionId, sub.id));
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(companies).set({ subscriptionStatus: "canceled" })
        .where(eq(companies.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
