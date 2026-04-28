"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, TrendingUp } from "lucide-react";

function poolpalPrice(pools: number) {
  if (pools <= 5)  return 0;
  if (pools <= 25) return 79;
  if (pools <= 75) return 179;
  return 399;
}

function skimmerPrice(pools: number) {
  return Math.max(98, pools * 2);
}

function serviceTitanEstimate(pools: number) {
  // ServiceTitan charges per tech + onboarding; rough estimate for field service
  return Math.max(149, pools * 3.5);
}

const PAIN_POINTS = [
  {
    emoji: "💸",
    title: "Skimmer doubled their price overnight",
    pain: "Their per-pool pricing means a 100-pool company pays $200+/month — and it keeps going up.",
    fix: "Flat $179/month up to 75 pools. We don't charge you for growing your business.",
  },
  {
    emoji: "📱",
    title: "Android app crashes mid-route",
    pain: "Missing a pool because your app froze costs you client trust and money.",
    fix: "Built offline-first. Reports save locally and sync when you're back in range. Never lose a stop.",
  },
  {
    emoji: "📄",
    title: "No PDF invoices for commercial clients",
    pain: "HOAs and resorts require proper PDF invoices. Many competitors can't send them.",
    fix: "Auto-generate branded PDFs with line items, logo, and Stripe payment links. One click.",
  },
];

export function PricingCalculator() {
  const [pools, setPools] = useState(25);

  const pp       = poolpalPrice(pools);
  const sk       = skimmerPrice(pools);
  const st       = Math.round(serviceTitanEstimate(pools));
  const savings  = sk - pp;
  const annual   = savings * 12;
  const gasTanks = Math.floor(annual / 80);

  const rows = [
    { name: "PoolPal AI", monthly: pp,   annual: pp * 12,   perPool: pools > 0 ? (pp / pools).toFixed(2) : "0", highlight: true },
    { name: "Skimmer",    monthly: sk,   annual: sk * 12,   perPool: pools > 0 ? (sk / pools).toFixed(2) : "0", highlight: false },
    { name: "ServiceTitan", monthly: st, annual: st * 12,   perPool: pools > 0 ? (st / pools).toFixed(2) : "0", highlight: false },
  ];

  return (
    <section className="bg-[#e8f1fc] py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">See exactly how much you'll save</h2>
          <p className="text-slate-500">Compare PoolPal AI to the competition — real numbers, no tricks.</p>
        </div>

        {/* Slider */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-slate-700 font-semibold">Pools you service</label>
            <span className="text-3xl font-bold text-[#1756a9]">{pools}</span>
          </div>
          <input
            type="range" min={1} max={200} value={pools}
            onChange={e => setPools(parseInt(e.target.value))}
            className="w-full accent-[#1756a9]"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
          </div>

          {/* Comparison table */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 text-slate-500 font-medium">Software</th>
                  <th className="text-right py-3 text-slate-500 font-medium">Monthly</th>
                  <th className="text-right py-3 text-slate-500 font-medium">Annual</th>
                  <th className="text-right py-3 text-slate-500 font-medium">Per pool</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name} className={`border-b border-slate-50 ${r.highlight ? "bg-[#e8f1fc] -mx-2" : ""}`}>
                    <td className={`py-3 font-semibold ${r.highlight ? "text-[#1756a9]" : "text-slate-700"}`}>
                      {r.name} {r.highlight && <span className="ml-2 text-xs bg-[#1756a9] text-white px-2 py-0.5 rounded-full font-bold">YOU</span>}
                    </td>
                    <td className={`text-right py-3 font-bold ${r.highlight ? "text-[#1756a9]" : "text-slate-900"}`}>
                      {r.monthly === 0 ? "Free" : `$${r.monthly}/mo`}
                    </td>
                    <td className="text-right py-3 text-slate-600">
                      {r.annual === 0 ? "Free" : `$${r.annual.toLocaleString()}`}
                    </td>
                    <td className="text-right py-3 text-slate-400 text-xs">
                      {r.monthly === 0 ? "Free" : `$${r.perPool}/pool`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {savings > 0 && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">You save ${annual.toLocaleString()}/year vs Skimmer</p>
              {gasTanks > 0 && (
                <p className="text-sm text-emerald-600 mt-1">That's {gasTanks} full tanks of gas for your truck 🚛</p>
              )}
              <Link href="/auth/login">
                <button className="mt-4 bg-[#1756a9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1245a0] transition-colors">
                  Start saving — free 14-day trial →
                </button>
              </Link>
            </div>
          )}

          {pools <= 5 && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-xl font-bold text-emerald-700">PoolPal AI is completely free for up to 5 pools</p>
              <p className="text-sm text-emerald-600 mt-1">No credit card. No trial expiry. Free forever for solo operators.</p>
              <Link href="/auth/login">
                <button className="mt-4 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
                  Get started free →
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Pain points */}
        <div className="grid md:grid-cols-3 gap-6">
          {PAIN_POINTS.map(p => (
            <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{p.emoji}</div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm">{p.title}</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{p.pain}</p>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 font-medium leading-relaxed">{p.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
