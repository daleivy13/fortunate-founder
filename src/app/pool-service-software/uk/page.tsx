import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Waves, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pool Service Software for UK Pool Companies — PoolPal AI",
  description: "Pool service management software built for British pool service companies. HMRC mileage tracking, VAT invoicing, and professional PDF reports. £59/mo flat rate.",
  keywords: ["pool service software UK", "pool cleaning app UK", "pool maintenance software United Kingdom", "pool service management UK"],
  openGraph: {
    title: "Pool Service Software UK — PoolPal AI",
    description: "The pool service app built for British pool pros. HMRC mileage, VAT invoicing, offline-first.",
    type: "website",
  },
};

const FEATURES = [
  { icon: "📋", title: "Professional service reports",     desc: "Auto-email branded PDF reports after every visit. Clients see chemistry, work done, and photos."    },
  { icon: "🚗", title: "HMRC mileage tracking (45p/mile)", desc: "GPS logs every mile at the HMRC approved 45p/mile rate. Export at tax time automatically."             },
  { icon: "📄", title: "VAT-inclusive invoicing",           desc: "Send Stripe payment links with optional VAT. Clients pay online in minutes, not weeks."               },
  { icon: "🧪", title: "AI chemistry dosing",               desc: "Instant dosage calculations. Claude AI explains every recommendation in plain English."                 },
  { icon: "📍", title: "Smart route planning",              desc: "Weather-aware daily routes. Tap a stop, service it, mark complete — all in one flow."                   },
  { icon: "💼", title: "Client portal",                     desc: "Clients see their chemistry history, reports, and can pay invoices online — branded to your business." },
];

const PLANS = [
  { name: "Solo",   price: "£59",  pools: "Up to 25 pools",    techs: "1 technician"      },
  { name: "Growth", price: "£139", pools: "Up to 75 pools",    techs: "5 technicians",  badge: "Most Popular" },
  { name: "Pro",    price: "£329", pools: "Unlimited pools",   techs: "Unlimited techs" },
];

export default function PoolServiceSoftwareUK() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden">
            <img src="/logo.png" alt="PoolPal AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-slate-900">PoolPal AI</span>
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">🇬🇧 UK</span>
        </Link>
        <Link href="/auth/login">
          <button className="bg-[#1756a9] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1245a0] transition-colors">
            Start Free Trial
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center max-w-4xl mx-auto">
        <div className="text-4xl mb-4">🇬🇧</div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          Pool Service Software<br />
          <span className="text-[#1756a9]">for UK Pool Companies</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-4">
          The pool service app built for British pool pros. HMRC mileage tracking,
          VAT invoicing, and professional PDF reports — all in one flat-rate subscription.
        </p>
        <p className="text-sm text-slate-400 mb-10">
          350,000+ residential pools in the UK — and growing every year.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/login">
            <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors flex items-center gap-2">
              Start free — no card required <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
          <p className="text-sm text-slate-400">From £59/month flat rate</p>
        </div>
      </section>

      {/* UK-specific highlights */}
      <section className="bg-[#e8f1fc] px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Built for UK pool businesses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🚗", title: "HMRC 45p/mile tracking",    desc: "GPS automatically logs miles at HMRC's approved 45p/mile rate. Export for your tax return." },
              { icon: "🧾", title: "VAT-inclusive invoicing",    desc: "Send invoices with VAT clearly broken out. Clients pay via Stripe in GBP." },
              { icon: "📋", title: "Professional PDF reports",   desc: "Auto-generated service reports with your logo. Clients receive them by email after every visit." },
              { icon: "📱", title: "Works offline on-site",      desc: "Signal patchy? Reports save locally and sync when you're back in range." },
              { icon: "🧪", title: "UK water chemistry",         desc: "Dosage recommendations tuned for UK water conditions and chemical brands." },
              { icon: "💷", title: "Priced in GBP",              desc: "Stripe billing in GBP. No currency conversion surprises." },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-900 mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Everything you need to run your pool business</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 bg-slate-50 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Simple GBP pricing</h2>
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
                {["Unlimited service reports", "PDF invoicing", "GPS mileage tracking", "AI chemistry AI", "Client portal"].map(f => (
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

      {/* Footer */}
      <footer className="px-6 py-10 text-center text-xs text-slate-400 border-t border-slate-100">
        <p>© {new Date().getFullYear()} PoolPal AI · Pool service software for UK professionals</p>
        <p className="mt-1">Also available: <Link href="/pool-service-software/australia" className="text-[#1756a9] hover:underline">Australia</Link> · <Link href="/" className="text-[#1756a9] hover:underline">United States</Link></p>
      </footer>
    </div>
  );
}
