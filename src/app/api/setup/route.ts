import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const checks = [
  { key: "DATABASE_URL",                      label: "Neon Database",                required: true  },
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY",       label: "Firebase Client",              required: true  },
  { key: "FIREBASE_PROJECT_ID",               label: "Firebase Admin",               required: true  },
  { key: "ANTHROPIC_API_KEY",                 label: "Claude AI (chemistry)",        required: true  },
  { key: "STRIPE_SECRET_KEY",                 label: "Stripe Payments",              required: true  },
  { key: "STRIPE_WEBHOOK_SECRET",             label: "Stripe Webhook",               required: true  },
  { key: "STRIPE_PRICE_SOLO_USD",             label: "Stripe Price: Solo",           required: true  },
  { key: "STRIPE_PRICE_GROWTH_USD",           label: "Stripe Price: Growth",         required: true  },
  { key: "STRIPE_PRICE_ENT_USD",              label: "Stripe Price: Enterprise",     required: true  },
  { key: "STRIPE_PRICE_HOMEOWNER",            label: "Stripe Price: Homeowner $9",   required: false },
  { key: "RESEND_API_KEY",                    label: "Resend Email",                 required: true  },
  { key: "OPENWEATHER_API_KEY",               label: "OpenWeatherMap (routes)",      required: false },
  { key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",   label: "Google Maps (GPS)",            required: false },
  { key: "NEXT_PUBLIC_APP_URL",               label: "App URL (production domain)",  required: false },
];

export async function GET() {
  const results = checks.map(({ key, label, required }) => {
    const val = process.env[key];
    const configured = Boolean(val && val.trim() && !val.startsWith("price_x") && val !== "sk_test_" && val !== "pk_test_" && val !== "re_" && val !== "whsec_" && val !== "ba_");
    return { key, label, required, configured, preview: configured ? `${val!.slice(0, 8)}…` : null };
  });

  const allRequired = results.filter(r => r.required).every(r => r.configured);

  return NextResponse.json({
    ready: allRequired,
    checks: results,
    summary: {
      total: results.length,
      configured: results.filter(r => r.configured).length,
      missing_required: results.filter(r => r.required && !r.configured).map(r => r.label),
    },
  });
}
