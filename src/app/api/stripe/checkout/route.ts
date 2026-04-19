import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

const PRICE_MAP: Record<string, Record<string, string>> = {
  solo:   { USD: process.env.STRIPE_PRICE_SOLO_USD   || process.env.STRIPE_PRICE_SMALL  || "", GBP: process.env.STRIPE_PRICE_SOLO_GBP   || "", EUR: process.env.STRIPE_PRICE_SOLO_EUR   || "", AUD: process.env.STRIPE_PRICE_SOLO_AUD   || "" },
  growth: { USD: process.env.STRIPE_PRICE_GROWTH_USD || process.env.STRIPE_PRICE_MEDIUM || "", GBP: process.env.STRIPE_PRICE_GROWTH_GBP || "", EUR: process.env.STRIPE_PRICE_GROWTH_EUR || "", AUD: process.env.STRIPE_PRICE_GROWTH_AUD || "" },
  large:  { USD: process.env.STRIPE_PRICE_ENT_USD    || process.env.STRIPE_PRICE_LARGE  || "", GBP: process.env.STRIPE_PRICE_ENT_GBP    || "", EUR: process.env.STRIPE_PRICE_ENT_EUR    || "", AUD: process.env.STRIPE_PRICE_ENT_AUD    || "" },
  // Legacy plan IDs
  small:  { USD: process.env.STRIPE_PRICE_SMALL  || "" },
  medium: { USD: process.env.STRIPE_PRICE_MEDIUM || "" },
};

const REVOLUT_LOCALES = ["en-GB","fr-FR","de-DE","it-IT","es-ES","pt-PT","nl-NL","pl-PL","sv-SE","da-DK","fi-FI","nb-NO"];

export async function POST(req: NextRequest) {
  try {
    const { plan, email, userId, companyName, currency = "USD", locale = "en-US" } = await req.json();

    const planPrices = PRICE_MAP[plan];
    if (!planPrices) return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 });

    const priceId = planPrices[currency] || planPrices["USD"] || "";
    if (!priceId) {
      return NextResponse.json({
        error: "Stripe price not configured. See .env.example for required STRIPE_PRICE_* variables.",
      }, { status: 400 });
    }

    const existing = await stripe.customers.list({ email, limit: 1 });
    let customer   = existing.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email, name: companyName, metadata: { userId, plan, currency, locale } });
    }

    // Payment methods — always card, add Revolut Pay for UK/EU
    const paymentMethodTypes: string[] = ["card"];
    if (REVOLUT_LOCALES.includes(locale) || currency === "GBP" || currency === "EUR") {
      paymentMethodTypes.push("revolut_pay");
    }
    if (currency === "BRL") paymentMethodTypes.push("boleto");

    const session = await stripe.checkout.sessions.create({
      customer,
      mode: "subscription",
      payment_method_types: paymentMethodTypes as any,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId, plan, currency, companyName },
      },
      billing_address_collection: "required",
      allow_promotion_codes: true,
      metadata: { userId, plan, currency, locale },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
