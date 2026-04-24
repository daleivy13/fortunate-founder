import Link from "next/link";
import { Waves, MapPin, FlaskConical, FileText, DollarSign, Car, Star, ChevronRight, CheckCircle2, Zap, Users, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: MapPin,       title: "Smart Routes",          desc: "Weather-aware daily routes with AI dosage adjustments. Navigate pool-to-pool with one tap."     },
  { icon: FlaskConical, title: "AI Chemistry",           desc: "Instant dosage calculations for any pool size. Claude AI explains every recommendation."        },
  { icon: FileText,     title: "PDF Service Reports",    desc: "Auto-generated professional reports emailed to clients after every visit. Zero paperwork."       },
  { icon: DollarSign,   title: "Stripe Invoicing",       desc: "Send invoices and collect card payments online. Clients pay in minutes, not weeks."             },
  { icon: Car,          title: "Mileage Tracking",       desc: "GPS logs every mile. Export at tax time for your $0.67/mile IRS deduction automatically."       },
  { icon: Users,        title: "Customer Portal",        desc: "Clients see their chemistry history, reports, and can pay invoices — all in one branded link."  },
];

const PLANS = [
  {
    name: "Solo",    price: 79,  badge: null,
    pools: "Up to 25 pools", techs: "1 technician",
    features: ["Unlimited reports + PDF", "GPS mileage tracking", "AI chemistry", "Stripe invoicing", "Email notifications"],
  },
  {
    name: "Growth",  price: 179, badge: "Most Popular",
    pools: "Up to 75 pools", techs: "5 technicians",
    features: ["Everything in Solo", "5 technicians", "Route optimization AI", "Analytics dashboard", "SMS notifications", "Priority support"],
  },
  {
    name: "Enterprise", price: 399, badge: null,
    pools: "Unlimited pools", techs: "Unlimited techs",
    features: ["Everything in Growth", "Unlimited technicians", "White-label reports", "API access", "Dedicated account manager"],
  },
];

const TESTIMONIALS = [
  { name: "Carlos M.", co: "SunState Pool Services, AZ", stars: 5, text: "Switched from Skimmer 3 months ago. My routes are 40 minutes shorter per day and clients love the automatic reports." },
  { name: "Jennifer L.", co: "Blue Wave Pools, FL",       stars: 5, text: "The mileage tracking alone paid for the subscription. I got $2,400 back in tax deductions I was missing before." },
  { name: "Marcus T.", co: "ClearWater Pro, TX",          stars: 5, text: "AI chemistry is a game changer. I used to spend 15 minutes calculating doses — now it's instant." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1756a9] rounded-xl flex items-center justify-center">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">PoolPal AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-slate-900 transition-colors">Reviews</a>
          <Link href="/homeowner" className="hover:text-slate-900 transition-colors">Homeowners</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">
            Sign in
          </Link>
          <Link href="/auth/login">
            <button className="bg-[#1756a9] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1245a0] transition-colors">
              Start Free Trial
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#e8f1fc] text-[#1756a9] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          AI-powered pool service management
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Run your pool route<br />
          <span className="text-[#1756a9]">like a pro business.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Smart routes, AI chemistry dosages, automatic client reports, GPS mileage tracking, and Stripe invoicing — everything a pool service company needs in one platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/login">
            <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors flex items-center gap-2 shadow-lg shadow-blue-200">
              Start 14-Day Free Trial
              <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
          <p className="text-sm text-slate-400">No credit card required</p>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { val: "500+", label: "Pool companies" },
            { val: "40 min",  label: "Saved per day" },
            { val: "$2,400",  label: "Avg tax savings" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-[#1756a9]">{s.val}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need to scale</h2>
            <p className="text-slate-500">Built specifically for pool service professionals. Not a generic field service app.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-[#e8f1fc] rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#1756a9]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">From signup to first invoice in 10 minutes</h2>
          <p className="text-slate-500">No training required. No complicated setup.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Add your pools", desc: "Import from Skimmer CSV or add manually. Takes 2 minutes for 25 pools." },
            { step: "2", title: "Run your route", desc: "Start GPS, get weather-aware briefings, log chemistry, and mark stops complete." },
            { step: "3", title: "Get paid",       desc: "Reports auto-email to clients. Invoices go out with a one-click Stripe payment link." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1756a9] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-[#e8f1fc] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Pool techs love it</h2>
            <p className="text-slate-500">Real results from real pool service companies.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">"{t.text}"</p>
                <p className="text-xs font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">{t.co}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-slate-500">14-day free trial on every plan. No credit card to start.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border flex flex-col ${
                plan.badge ? "border-[#1756a9] border-2 shadow-lg shadow-blue-100" : "border-slate-200"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1756a9] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <h3 className="font-bold text-slate-900 text-lg mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{plan.pools} · {plan.techs}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" className="block">
                <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.badge
                    ? "bg-[#1756a9] text-white hover:bg-[#1245a0]"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}>
                  Start Free Trial
                </button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-400 mt-8">
          All plans include a 14-day free trial · 0.5% platform fee on invoice payments · Cancel anytime
        </p>
      </section>

      {/* Homeowner CTA */}
      <section className="mx-6 mb-16 rounded-3xl bg-gradient-to-br from-[#1756a9] to-[#00c3e3] p-10 text-white text-center max-w-4xl lg:mx-auto">
        <Waves className="w-10 h-10 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold mb-2">Are you a pool owner?</h2>
        <p className="text-white/80 mb-6 text-sm max-w-md mx-auto">
          PoolPal+ gives homeowners instant chemistry dosages, trend tracking, and a direct line to find certified local pros.
        </p>
        <Link href="/homeowner">
          <button className="bg-white text-[#1756a9] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm">
            Try PoolPal for Homeowners →
          </button>
        </Link>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-slate-900">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to grow your pool business?</h2>
        <p className="text-slate-400 mb-8">Join hundreds of pool service companies already using PoolPal AI.</p>
        <Link href="/auth/login">
          <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors">
            Start Your Free 14-Day Trial
          </button>
        </Link>
        <p className="text-slate-500 text-sm mt-4">No credit card required · Cancel anytime</p>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1756a9] rounded-lg flex items-center justify-center">
              <Waves className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">PoolPal AI</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/homeowner" className="hover:text-white transition-colors">Homeowners</Link>
            <Link href="/pool-service-software/phoenix-az" className="hover:text-white transition-colors">Pool Service Software</Link>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} PoolPal AI · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
