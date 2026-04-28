"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

const PAIN_CARDS = [
  {
    emoji: "💸",
    title: "Skimmer doubled their price overnight",
    pain:  "Their per-pool pricing means a 100-pool company pays $200+/month — and it keeps going up. Growth shouldn't be punished.",
    fix:   "Flat $179/month. Unlimited pools up to 75. We don't charge you for growing.",
  },
  {
    emoji: "📱",
    title: "Android app crashes mid-route",
    pain:  "Missing a pool because your app froze costs you client trust and real money. It happened to thousands of Skimmer users.",
    fix:   "Built offline-first. Data saves locally and syncs when you're back in range. Never lose a report.",
  },
  {
    emoji: "📄",
    title: "No PDF invoices for commercial clients",
    pain:  "HOAs and resorts require proper branded PDF invoices with line items. Most competitors can't send them at all.",
    fix:   "Auto-generate professional PDFs with your logo, line items, and Stripe payment links. One click.",
  },
];

function poolpalPrice(pools: number) {
  if (pools <= 5)  return 0;
  if (pools <= 25) return 79;
  if (pools <= 75) return 179;
  return 399;
}
function skimmerPrice(pools: number) { return Math.max(98, pools * 2); }

export function WhySwitchSection() {
  const [pools, setPools] = useState(30);
  const pp  = poolpalPrice(pools);
  const sk  = skimmerPrice(pools);
  const diff = sk - pp;
  const muriatic = Math.floor((diff * 12) / 15);

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto space-y-16">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Tired of paying more every year?</h2>
          <p className="text-slate-500 text-lg">Pool service software that doesn't penalize you for growing.</p>
        </div>

        {/* Pain point cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PAIN_CARDS.map(c => (
            <div key={c.title} className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
              <div className="text-3xl mb-4">{c.emoji}</div>
              <h3 className="font-bold text-slate-900 mb-2">{c.title}</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{c.pain}</p>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">{c.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live savings calculator */}
        <div className="bg-[#e8f1fc] rounded-3xl p-8">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-6">See your savings in real time</h3>
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-700 font-medium">I service</span>
              <span className="text-2xl font-bold text-[#1756a9]">{pools} pools</span>
            </div>
            <input
              type="range" min={1} max={200} value={pools}
              onChange={e => setPools(parseInt(e.target.value))}
              className="w-full accent-[#1756a9] mb-6"
            />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
                <p className="text-xs text-slate-400 mb-1">Skimmer</p>
                <p className="text-2xl font-bold text-red-500">${sk}/mo</p>
              </div>
              <div className="bg-[#1756a9] rounded-xl p-4 text-center">
                <p className="text-xs text-white/70 mb-1">PoolPal AI</p>
                <p className="text-2xl font-bold text-white">{pp === 0 ? "Free" : `$${pp}/mo`}</p>
              </div>
            </div>
            {diff > 0 && (
              <div className="bg-white rounded-xl p-4 text-center border border-emerald-200">
                <p className="text-sm text-slate-600">You save <strong className="text-emerald-600">${diff}/mo</strong> — that's <strong>${diff * 12}/year</strong></p>
                <p className="text-xs text-slate-400 mt-1">That's {muriatic} gallons of muriatic acid at $15/gal 😄</p>
              </div>
            )}
          </div>
        </div>

        {/* Migration CTA */}
        <div className="rounded-3xl text-white text-center p-12" style={{ background: "linear-gradient(135deg, #0f3f84, #1756a9)" }}>
          <h3 className="text-2xl font-bold mb-3">Switching from Skimmer takes 20 minutes</h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Import your customer list with our Skimmer CSV importer. Your data, your clients — moved over in one click.
          </p>
          <Link href="/auth/login?from=skimmer">
            <button className="bg-white text-[#1756a9] font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors flex items-center gap-2 mx-auto">
              Import from Skimmer <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="text-white/50 text-sm mt-4">No credit card · 14-day free trial · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}
