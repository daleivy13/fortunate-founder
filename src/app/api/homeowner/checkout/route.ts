import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments not configured. Add STRIPE_SECRET_KEY to .env.local." },
      { status: 503 }
    );
  }

  try {
    const { email, guestId } = await req.json();
    const priceId = process.env.STRIPE_PRICE_HOMEOWNER;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_HOMEOWNER not configured in .env.local." },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${appUrl}/homeowner?pro=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/homeowner`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { guestId: guestId ?? "" },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[homeowner/checkout]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
