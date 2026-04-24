"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Waves, Zap, AlertTriangle, TrendingUp, Lock, MapPin, ShoppingCart, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ChemReading {
  date: string;
  cl: number;
  ph: number;
  ta?: number;
  temp?: number;
}

function ChemBadge({ label, value, good }: { label: string; value: number | string; good: boolean }) {
  return (
    <div className={`text-center p-3 rounded-xl ${good ? "bg-emerald-50" : "bg-red-50"}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${good ? "text-emerald-600" : "text-red-600"}`}>{value}</p>
    </div>
  );
}

function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("guestId");
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("guestId", id); }
  return id;
}

function loadHistory(): ChemReading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("chemHistory");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function HomeownerDashboard() {
  const router = useRouter();
  const [isPro,       setIsPro]       = useState(false);
  const [checksLeft,  setChecksLeft]  = useState(1);
  const [history,     setHistory]     = useState<ChemReading[]>([]);
  const [loaded,      setLoaded]      = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setLoaded(true);
    const userId = getGuestId();
    if (!userId) return;
    fetch(`/api/homeowner/usage?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.checksRemaining === "number") setChecksLeft(d.checksRemaining);
        if (d.isPro) setIsPro(true);
      })
      .catch(() => {});
  }, []);

  const latest  = history[0] ?? null;
  const clOk    = latest ? latest.cl >= 1 && latest.cl <= 4 : true;
  const phOk    = latest ? latest.ph >= 7.2 && latest.ph <= 7.6 : true;
  const allOk   = !latest || (clOk && phOk);

  const headerGradient = allOk
    ? "bg-gradient-to-br from-[#1756a9] to-pool-600"
    : "bg-gradient-to-br from-red-600 to-amber-500";

  // Derive recommended chemicals based on latest reading
  const chemRecs: { name: string; amount: string; price: string; link: string }[] = [];
  if (latest) {
    if (!phOk && latest.ph > 7.6)
      chemRecs.push({ name: "Muriatic Acid 1 Gal", amount: "Lower pH", price: "$8.99", link: "https://www.amazon.com/s?k=muriatic+acid+pool" });
    if (!phOk && latest.ph < 7.2)
      chemRecs.push({ name: "Soda Ash (pH Up) 5 lb", amount: "Raise pH", price: "$12.99", link: "https://www.amazon.com/s?k=soda+ash+pool+ph" });
    if (!clOk && latest.cl < 1)
      chemRecs.push({ name: "Liquid Chlorine 1 Gal", amount: "Sanitize pool", price: "$6.99", link: "https://www.amazon.com/s?k=pool+liquid+chlorine" });
    if (latest.ta !== undefined && (latest.ta < 80 || latest.ta > 120))
      chemRecs.push({ name: "Sodium Bicarbonate 5 lb", amount: "Balance alkalinity", price: "$9.99", link: "https://www.amazon.com/s?k=pool+alkalinity+increaser" });
  }
  if (chemRecs.length === 0)
    chemRecs.push({ name: "Shock Treatment 1 lb", amount: "Weekly maintenance", price: "$5.99", link: "https://www.amazon.com/s?k=pool+shock+treatment" });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className={`${headerGradient} text-white px-5 pt-12 pb-8`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Waves className="w-6 h-6" />
            <span className="font-bold text-lg">PoolPal</span>
          </div>
          {!isPro && (
            <button
              onClick={() => router.push("/homeowner/upgrade")}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              Upgrade $9/mo
            </button>
          )}
          {isPro && (
            <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-semibold">Pool+ ✓</span>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/70 text-sm mb-1">Your pool status</p>
          {!loaded ? (
            <h1 className="text-3xl font-bold mb-2">Loading…</h1>
          ) : latest ? (
            <>
              <h1 className="text-3xl font-bold mb-2">{allOk ? "All Good 🌊" : "Needs Attention ⚠️"}</h1>
              <p className="text-white/80 text-sm">
                {allOk ? "Chemistry is balanced" : `${!clOk ? "Chlorine" : "pH"} out of range — check recommendations below`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">No reading yet 🔬</h1>
              <p className="text-white/80 text-sm">Run your first chemistry check below</p>
            </>
          )}
          {!isPro && (
            <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 text-sm">
              {checksLeft > 0 ? `${checksLeft} free check remaining this week` : "Upgrade for unlimited checks"}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Chemistry snapshot */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Latest Reading</h2>
            {latest && <span className="text-xs text-slate-400">{latest.date}</span>}
          </div>

          {latest ? (
            <>
              <div className={`grid gap-2 ${latest.ta !== undefined ? "grid-cols-4" : "grid-cols-2"}`}>
                <ChemBadge label="Cl" value={latest.cl} good={clOk} />
                <ChemBadge label="pH" value={latest.ph} good={phOk} />
                {latest.ta   !== undefined && <ChemBadge label="TA"  value={latest.ta}   good={latest.ta >= 80 && latest.ta <= 120} />}
                {latest.temp !== undefined && <ChemBadge label="°F"  value={latest.temp} good />}
              </div>
              {!allOk && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {!clOk && latest.cl < 1
                      ? "Chlorine is too low — risk of algae. Add liquid chlorine immediately."
                      : !phOk && latest.ph > 7.6
                      ? `pH is too high (${latest.ph}) — add muriatic acid, then retest.`
                      : !phOk && latest.ph < 7.2
                      ? `pH is too low (${latest.ph}) — add soda ash, then retest.`
                      : "Chemistry imbalance detected — see recommendations below."}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 py-2">No reading recorded yet. Run a check to see your pool status.</p>
          )}

          <Link href="/homeowner/check">
            <button className="btn-primary w-full mt-3 text-sm">
              <Zap className="w-4 h-4" />
              {checksLeft > 0 || isPro ? "Run Chemistry Check" : "Upgrade to Check Again"}
            </button>
          </Link>
        </div>

        {/* History */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pool-600" />
              Chemistry History
            </h2>
            {!isPro && <Lock className="w-4 h-4 text-slate-400" />}
          </div>

          {isPro ? (
            history.length > 0 ? (
              <div className="space-y-2">
                {history.slice(0, 10).map((r, i) => {
                  const rClOk = r.cl >= 1 && r.cl <= 4;
                  const rPhOk = r.ph >= 7.2 && r.ph <= 7.6;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-400 w-14">{r.date}</span>
                      <div className="flex gap-3 flex-1">
                        <span className={`text-xs font-semibold ${rClOk ? "text-emerald-600" : "text-red-600"}`}>Cl {r.cl}</span>
                        <span className={`text-xs font-semibold ${rPhOk ? "text-emerald-600" : "text-amber-600"}`}>pH {r.ph}</span>
                        {r.ta !== undefined && <span className="text-xs text-slate-400">TA {r.ta}</span>}
                      </div>
                      {(!rClOk || !rPhOk) && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-2">No history yet. Run your first check to start tracking.</p>
            )
          ) : (
            <div className="relative">
              <div className="space-y-2 opacity-30 pointer-events-none select-none">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-400 w-14">—</span>
                    <span className="text-xs font-semibold">Cl —</span>
                    <span className="text-xs font-semibold">pH —</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                <button
                  onClick={() => router.push("/homeowner/upgrade")}
                  className="flex items-center gap-2 bg-pool-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-pool-600 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Unlock History — $9/mo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Find a pro */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pool-600" />
              Find a Local Pro
            </h2>
          </div>

          {!allOk && (
            <div className="bg-pool-50 border border-pool-200 rounded-xl p-3 mb-3">
              <p className="text-sm font-semibold text-pool-900">Your pool may need professional attention</p>
              <p className="text-xs text-pool-700 mt-0.5">Recurring chemistry issues can indicate equipment problems a local tech can diagnose.</p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-3">
            PoolPal-certified technicians in your area use professional-grade equipment and follow strict service standards.
          </p>

          <Link href="/homeowner/find-pro">
            <button className="w-full flex items-center justify-between p-3 bg-pool-50 border border-pool-200 rounded-xl text-sm font-semibold text-pool-700 hover:bg-pool-100 transition-colors">
              Search pool pros near you
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Chemical shopping list */}
        <div className="card p-4 mb-8">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-pool-600" />
            Recommended Chemicals
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {latest ? "Based on your latest reading:" : "General maintenance supplies:"}
          </p>
          <div className="space-y-2">
            {chemRecs.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.amount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{item.price}</p>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-pool-600 font-semibold">
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
