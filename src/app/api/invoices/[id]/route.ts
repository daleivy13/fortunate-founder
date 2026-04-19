import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { invoices } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" })
  : null;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, parseInt(params.id)));
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice: inv });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = parseInt(params.id);

    // If marking as sent, create Stripe payment link
    if (body.action === "send" && stripe) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
      const lineItems = JSON.parse(inv.lineItems) as { desc: string; qty: number; rate: number }[];

      const stripeLineItems = lineItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.desc },
          unit_amount: Math.round(item.rate * 100),
        },
        quantity: item.qty,
      }));

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices?paid=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices`,
        customer_email: inv.clientEmail ?? undefined,
        metadata: { invoiceId: String(id) },
      });

      const [updated] = await db
        .update(invoices)
        .set({ status: "sent", sentAt: new Date(), stripePaymentIntentId: session.id })
        .where(eq(invoices.id, id))
        .returning();

      return NextResponse.json({ invoice: updated, paymentUrl: session.url });
    }

    // Mark as paid
    if (body.action === "mark_paid") {
      const [updated] = await db
        .update(invoices)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();
      return NextResponse.json({ invoice: updated });
    }

    // Generic update
    const [updated] = await db.update(invoices).set(body).where(eq(invoices.id, id)).returning();
    return NextResponse.json({ invoice: updated });
  } catch (err: any) {
    console.error("[api/invoices/[id] PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.delete(invoices).where(eq(invoices.id, parseInt(params.id)));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
