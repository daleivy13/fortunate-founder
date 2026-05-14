import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/backend/db";
import { serviceLeads, leadPurchases, companies } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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
  if (isNaN(leadId)) {
    return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
  }

  const body = await req.json();
  const companyId: number = body.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  // Verify lead exists and is open
  const [lead] = await db.select().from(serviceLeads).where(eq(serviceLeads.id, leadId));
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "open") {
    return NextResponse.json({ error: "Lead is no longer available" }, { status: 409 });
  }

  // Check if already unlocked by this company
  const [existing] = await db
    .select()
    .from(leadPurchases)
    .where(and(eq(leadPurchases.leadId, leadId), eq(leadPurchases.proCompanyId, companyId)));
  if (existing) {
    return NextResponse.json({ alreadyUnlocked: true, purchase: existing });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 1000, // $10.00
        product_data: {
          name: `Lead Unlock — ${lead.city ?? lead.zipCode} Pool Service`,
          description: `Reveal contact info for homeowner in ${lead.city ?? lead.zipCode}, ${lead.state ?? ""}`,
        },
      },
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/lead-success?leadId=${leadId}&companyId=${companyId}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/leads`,
    metadata: {
      type:      "lead_unlock",
      leadId:    String(leadId),
      companyId: String(companyId),
      userId:    auth.uid,
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
