import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pool Service Software for Australian Pool Companies — PoolPal AI",
  description: "Pool service management app for Australian pool businesses. ATO mileage tracking, GST invoicing, metric units. A$119/mo flat rate. 1.2 million+ pools in Australia.",
  keywords: ["pool service software Australia", "pool cleaning app Sydney", "pool maintenance app Melbourne", "pool service management Australia", "pool service app Brisbane"],
  openGraph: {
    title: "Pool Service Software Australia — PoolPal AI",
    description: "Run your Aussie pool business smarter. ATO mileage, GST invoicing, metric units.",
    type: "website",
  },
};

const AU_FEATURES = [
  { icon: "🚗", title: "ATO mileage tracking (88c/km)",    desc: "GPS logs every kilometre at the ATO's approved 88c/km rate. Export for your tax return automatically." },
  { icon: "🧾", title: "GST invoicing support",             desc: "Send invoices with GST clearly shown. Clients pay online via Stripe in AUD." },
  { icon: "📏", title: "Metric units throughout",           desc: "Litres, Celsius, kilometres — no switching between unit systems. Built for Aussie techs." },
  { icon: "📋", title: "Professional PDF reports",          desc: "Auto-generated service reports emailed after every visit. Pool owners love the transparency." },
  { icon: "📱", title: "Works offline on-site",             desc: "No signal? Reports save locally and sync when you're back in range. Never lose a stop." },
  { icon: "🧪", title: "AI chemistry for Aus conditions",   desc: "Dosage recommendations that factor in Australian climate and water chemistry." },
];

const PLANS = [
  { name: "Solo",   price: "A$119", pools: "Up to 25 pools",  techs: "1 technician"       },
  { name: "Growth", price: "A$269", pools: "Up to 75 pools",  techs: "5 technicians",  badge: "Most Popular" },
  { name: "Pro",    price: "A$649", pools: "Unlimited pools",  techs: "Unlimited techs" },
];

const AU_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Sunshine Coast"];

export default function PoolServiceSoftwareAustralia() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden">
            <img src="/logo.png" alt="PoolPal AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-slate-900">PoolPal AI</span>
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">🇦🇺 Australia</span>
        </Link>
        <Link href="/auth/login">
          <button className="bg-[#1756a9] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1245a0] transition-colors">
            Start Free Trial
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center max-w-4xl mx-auto">
        <div className="text-4xl mb-4">🇦🇺</div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          Run your Aussie pool business<br />
          <span className="text-[#1756a9]">smarter.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-4">
          ATO mileage tracking, GST invoicing, metric units, and AI chemistry dosing —
          everything Australian pool service companies need in one flat-rate app.
        </p>
        <p className="text-sm text-slate-400 mb-10">
          🌊 Australia has 1.2 million+ pools — the highest per capita globally.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/login">
            <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors flex items-center gap-2">
              Start free — no card required <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
          <p className="text-sm text-slate-400">From A$119/month flat rate</p>
        </div>
      </section>

      {/* AU-specific features */}
      <section className="bg-[#e8f1fc] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Built for Australian pool businesses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AU_FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-900 mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Simple AUD pricing</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map(plan => (
            <div key={plan.name} className={`relative rounded-2xl p-6 border flex flex-col ${plan.badge ? "border-[#1756a9] border-2 shadow-lg" : "border-slate-200 bg-white"}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1756a9] text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</div>
              )}
              <h3 className="font-bold text-slate-900 text-lg mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{plan.pools} · {plan.techs}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {["Unlimited service reports", "GST-ready invoicing", "ATO mileage tracking", "AI chemistry (metric)", "Client portal"].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/login">
                <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.badge ? "bg-[#1756a9] text-white hover:bg-[#1245a0]" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  Start Free Trial
                </button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mt-6">14-day free trial · No credit card required · Cancel anytime</p>
      </section>

      {/* Cities */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Serving pool companies across Australia</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {AU_CITIES.map(city => (
              <span key={city} className="bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                📍 {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-slate-400 border-t border-slate-100">
        <p>© {new Date().getFullYear()} PoolPal AI · Pool service software for Australian professionals</p>
        <p className="mt-1">Also available: <Link href="/pool-service-software/uk" className="text-[#1756a9] hover:underline">United Kingdom</Link> · <Link href="/" className="text-[#1756a9] hover:underline">United States</Link></p>
      </footer>
    </div>
  );
}
