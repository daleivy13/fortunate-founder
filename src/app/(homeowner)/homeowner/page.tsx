"use client";

import { useState, useEffect } from "react";
import { Waves, Zap, AlertTriangle, TrendingUp, Lock, MapPin, ShoppingCart } from "lucide-react";
import Link from "next/link";

const MOCK_HISTORY = [
  { date: "Apr 18", cl: 0.8, ph: 8.4, ta: 120, temp: 84 },
  { date: "Apr 11", cl: 2.1, ph: 7.9, ta: 115, temp: 82 },
  { date: "Apr 4",  cl: 2.8, ph: 7.5, ta: 110, temp: 79 },
  { date: "Mar 28", cl: 3.0, ph: 7.4, ta: 105, temp: 76 },
];

const MOCK_PROS = [
  { id: 1, name: "Marco's Pool Service", rating: 4.9, pools: 47, distance: "0.8 mi", initials: "MD", color: "#0ea5e9" },
  { id: 2, name: "Sunbelt Pool Pros",    rating: 4.7, pools: 120, distance: "1.4 mi", initials: "SP", color: "#8b5cf6", featured: true },
  { id: 3, name: "Desert Blue Pools",   rating: 4.8, pools: 38, distance: "2.1 mi", initials: "DB", color: "#1756a9" },
];

function ChemBadge({ label, value, good }: { label: string; value: number | string; good: boolean }) {
  return (
    <div className={`text-center p-3 rounded-xl ${good ? "bg-emerald-50" : "bg-red-50"}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${good ? "text-emerald-600" : "text-red-600"}`}>{value}</p>
    </div>
  );
}

export default function HomeownerDashboard() {
  const [isPro, setIsPro]   = useState(false);
  const [checksLeft, setChecksLeft] = useState(1);
  const [showGate, setShowGate] = useState(false);

  const latest = MOCK_HISTORY[0];
  const clOk   = latest.cl >= 1 && latest.cl <= 4;
  const phOk   = latest.ph >= 7.2 && latest.ph <= 7.6;
  const allOk  = clOk && phOk;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${allOk ? "bg-gradient-to-br from-[#1756a9] to-pool-600" : "bg-gradient-to-br from-red-600 to-amber-500"} text-white px-5 pt-12 pb-8`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Waves className="w-6 h-6" />
            <span className="font-bold text-lg">PoolPal</span>
          </div>
          <div className="flex items-center gap-2">
            {!isPro && (
              <button
                onClick={() => setIsPro(true)}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold transition-colors"
              >
                Upgrade $9/mo
              </button>
            )}
            {isPro && (
              <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-semibold">
                Pool+ ✓
              </span>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-white/70 text-sm mb-1">Your pool status</p>
          <h1 className="text-3xl font-bold mb-2">
            {allOk ? "All Good 🌊" : "Needs Attention ⚠️"}
          </h1>
          <p className="text-white/80 text-sm">
            {allOk
              ? "Your pool chemistry is balanced"
              : "pH is high — see recommendations below"}
          </p>
          {!isPro && (
            <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 text-sm">
              {checksLeft} free check remaining this week
            </div>
          )}
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Chemistry snapshot */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Latest Reading</h2>
            <span className="text-xs text-slate-400">{latest.date}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ChemBadge label="Cl" value={latest.cl} good={clOk} />
            <ChemBadge label="pH" value={latest.ph} good={phOk} />
            <ChemBadge label="TA" value={latest.ta} good={latest.ta >= 80 && latest.ta <= 120} />
            <ChemBadge label="°F" value={latest.temp} good={true} />
          </div>

          {!allOk && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">pH is too high (8.4)</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Add 6 fl oz muriatic acid per 10,000 gallons. Run pump for 4 hours then retest.
                </p>
              </div>
            </div>
          )}

          <Link href="/homeowner/check">
            <button className="btn-primary w-full mt-3 text-sm">
              <Zap className="w-4 h-4" />
              {checksLeft > 0 ? "Run Chemistry Check" : "Upgrade to Check Again"}
            </button>
          </Link>
        </div>

        {/* History — locked for free users */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pool-600" />
              Chemistry History
            </h2>
            {!isPro && <Lock className="w-4 h-4 text-slate-400" />}
          </div>

          {isPro ? (
            <div className="space-y-2">
              {MOCK_HISTORY.map((r, i) => {
                const rClOk = r.cl >= 1 && r.cl <= 4;
                const rPhOk = r.ph >= 7.2 && r.ph <= 7.6;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-400 w-14">{r.date}</span>
                    <div className="flex gap-3 flex-1">
                      <span className={`text-xs font-semibold ${rClOk ? "text-emerald-600" : "text-red-600"}`}>Cl {r.cl}</span>
                      <span className={`text-xs font-semibold ${rPhOk ? "text-emerald-600" : "text-amber-600"}`}>pH {r.ph}</span>
                      <span className="text-xs text-slate-400">TA {r.ta}</span>
                    </div>
                    {(!rClOk || !rPhOk) && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                );
              })}
              <p className="text-xs text-slate-400 pt-1">
                💡 pH trending high for 3 weeks. High summer temps may be the cause.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="space-y-2 opacity-30 pointer-events-none select-none">
                {MOCK_HISTORY.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-400 w-14">{r.date}</span>
                    <span className="text-xs font-semibold">Cl {r.cl}</span>
                    <span className="text-xs font-semibold">pH {r.ph}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                <button
                  onClick={() => setIsPro(true)}
                  className="flex items-center gap-2 bg-pool-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-pool-600 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Unlock History — $9/mo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Book a pro */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pool-600" />
              Local Pool Pros
            </h2>
            <span className="text-xs text-slate-400">Scottsdale, AZ</span>
          </div>

          {!allOk && (
            <div className="bg-pool-50 border border-pool-200 rounded-xl p-3 mb-3">
              <p className="text-sm font-semibold text-pool-900">Your pool needs professional attention</p>
              <p className="text-xs text-pool-700 mt-0.5">pH imbalance lasting 3+ weeks may indicate a deeper issue. A local pro can diagnose and fix it.</p>
            </div>
          )}

          <div className="space-y-2">
            {MOCK_PROS.map((pro) => (
              <div key={pro.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: pro.color }}
                >
                  {pro.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                    {pro.name}
                    {pro.featured && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Featured</span>}
                  </p>
                  <p className="text-xs text-slate-400">⭐ {pro.rating} · {pro.pools} pools · {pro.distance}</p>
                </div>
                <button className="text-xs text-pool-600 font-semibold bg-pool-50 border border-pool-200 px-3 py-1.5 rounded-lg hover:bg-pool-100 transition-colors">
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chemical shopping list */}
        <div className="card p-4 mb-8">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-pool-600" />
            Shop Chemicals
          </h2>
          <p className="text-xs text-slate-500 mb-3">Based on your readings, you need:</p>
          <div className="space-y-2">
            {[
              { name: "Muriatic Acid 1 Gal", amount: "6 fl oz needed", price: "$8.99", urgent: true },
              { name: "Liquid Chlorine 1 Gal", amount: "Maintenance dose", price: "$6.99", urgent: false },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.amount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{item.price}</p>
                  <a
                    href="https://www.amazon.com/s?k=muriatic+acid+pool"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pool-600 font-semibold"
                  >
                    Buy →
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            PoolPal earns a small commission on purchases · No extra cost to you
          </p>
        </div>
      </div>
    </div>
  );
}
