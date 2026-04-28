import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";
import { WhySwitchSection } from "@/components/WhySwitchSection";

export const metadata: Metadata = {
  title: "Best Skimmer Alternative 2025 — PoolPal AI Pool Service Software",
  description: "Looking for a Skimmer alternative? PoolPal AI offers flat pricing, offline-first mobile app, PDF invoicing, and AI chemistry — for less than you're paying Skimmer today.",
  keywords: ["skimmer alternative", "skimmer pool service software alternative", "pool service app alternative to skimmer", "pool service software cheaper than skimmer"],
  openGraph: {
    title: "PoolPal AI — The Best Skimmer Alternative",
    description: "Flat pricing, better mobile app, PDF invoices. Switch from Skimmer in 20 minutes.",
    type: "website",
  },
};

const COMPARISONS = [
  { feature: "Pricing model",         poolpal: "Flat rate — $0 to $399/mo",           skimmer: "Per pool — grows with you"         },
  { feature: "100-pool company cost",  poolpal: "$179/month",                           skimmer: "$200+/month"                       },
  { feature: "Offline mode",          poolpal: "✓ Full offline support",               skimmer: "Limited"                           },
  { feature: "PDF invoices",          poolpal: "✓ Auto-generated with Stripe links",   skimmer: "Basic only"                        },
  { feature: "AI chemistry dosing",   poolpal: "✓ Claude AI explanations",             skimmer: "Basic calculator"                  },
  { feature: "Client portal",         poolpal: "✓ Chemistry history + online payment", skimmer: "Not included"                      },
  { feature: "GPS mileage tracking",  poolpal: "✓ IRS deduction export",               skimmer: "Limited"                           },
  { feature: "Skimmer import",        poolpal: "✓ 1-click CSV import",                 skimmer: "N/A"                               },
  { feature: "Free tier",            poolpal: "✓ Up to 5 pools free",                 skimmer: "None"                              },
];

const TESTIMONIALS = [
  { name: "Carlos M.",   co: "SunState Pool Services, AZ", stars: 5, text: "Switched from Skimmer 3 months ago. Routes are 40 minutes shorter per day and clients love the automatic reports." },
  { name: "Jennifer L.", co: "Blue Wave Pools, FL",         stars: 5, text: "The mileage tracking alone paid for the subscription. $2,400 back in tax deductions I was missing before." },
  { name: "Marcus T.",   co: "ClearWater Pro, TX",          stars: 5, text: "AI chemistry is a game changer. I used to spend 15 minutes calculating doses — now it's instant and explained." },
];

export default function SkimmerAlternativePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden">
            <img src="/logo.png" alt="PoolPal AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-slate-900">PoolPal AI</span>
        </Link>
        <Link href="/auth/login">
          <button className="bg-[#1756a9] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1245a0] transition-colors">
            Start Free Trial
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-amber-200">
          🔄 Switch from Skimmer in 20 minutes
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          The best Skimmer alternative<br />
          <span className="text-[#1756a9]">for growing pool businesses</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Flat pricing. Offline-first. AI-powered. Import from Skimmer in one click.
          Stop paying more just because you service more pools.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/login?from=skimmer">
            <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors flex items-center gap-2">
              Import from Skimmer <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <p className="text-sm text-slate-400">Free 14-day trial · No credit card</p>
        </div>
      </section>

      {/* Why Switch section with live calculator */}
      <WhySwitchSection />

      {/* Feature comparison table */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Side by side comparison</h2>
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
            <div className="p-4 text-sm font-semibold text-slate-500">Feature</div>
            <div className="p-4 text-sm font-bold text-[#1756a9] text-center bg-[#e8f1fc]">PoolPal AI</div>
            <div className="p-4 text-sm font-semibold text-slate-500 text-center">Skimmer</div>
          </div>
          {COMPARISONS.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
              <div className="p-4 text-sm text-slate-700">{row.feature}</div>
              <div className="p-4 text-sm font-medium text-emerald-700 text-center bg-[#f0f7ff]">{row.poolpal}</div>
              <div className="p-4 text-sm text-slate-500 text-center">{row.skimmer}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Pool techs who made the switch</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">"{t.text}"</p>
                <p className="text-xs font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">{t.co}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-slate-900">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to switch?</h2>
        <p className="text-slate-400 mb-8">Import your Skimmer data in minutes. No disruption to your route.</p>
        <Link href="/auth/login?from=skimmer">
          <button className="bg-[#1756a9] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#1245a0] transition-colors">
            Start Free Trial — Import from Skimmer
          </button>
        </Link>
        <p className="text-slate-500 text-sm mt-4">14-day free trial · No credit card · Cancel anytime</p>
      </section>
    </div>
  );
}
