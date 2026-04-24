"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Waves, ArrowLeft, Zap, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Dosage {
  chemical: string;
  amount: string;
  unit: string;
  reason: string;
  urgency: "critical" | "high" | "normal";
}

const FIELDS = [
  { key: "freeChlorine",    label: "Free Chlorine", unit: "ppm",  placeholder: "2.0", target: "2.0–4.0",  min: 1.0, max: 4.0  },
  { key: "ph",              label: "pH Level",      unit: "",     placeholder: "7.4", target: "7.2–7.6",  min: 7.2, max: 7.6  },
  { key: "totalAlkalinity", label: "Alkalinity",    unit: "ppm",  placeholder: "100", target: "80–120",   min: 80,  max: 120  },
  { key: "volumeGallons",   label: "Pool Size",     unit: "gal",  placeholder: "15000", target: "",       min: 0,   max: 999999 },
];

function calcDosages(vals: Record<string, string>): Dosage[] {
  const cl  = parseFloat(vals.freeChlorine)    || 0;
  const ph  = parseFloat(vals.ph)              || 7.4;
  const ta  = parseFloat(vals.totalAlkalinity) || 100;
  const vol = parseFloat(vals.volumeGallons)   || 15000;
  const f   = vol / 10000;
  const out: Dosage[] = [];

  if (cl < 1.0) {
    const oz = Math.round((2.0 - cl) * 8 * f * 10) / 10;
    out.push({ chemical: "Liquid Chlorine", amount: String(oz), unit: "fl oz", reason: `Cl ${cl} ppm — target is 2–4 ppm`, urgency: cl < 0.5 ? "critical" : "high" });
  }
  if (ph > 7.6) {
    const oz = Math.round((ph - 7.4) * 20 * f * 10) / 10;
    out.push({ chemical: "Muriatic Acid", amount: String(oz), unit: "fl oz", reason: `pH ${ph} — target is 7.2–7.6`, urgency: ph > 8.0 ? "high" : "normal" });
  } else if (ph < 7.2) {
    const oz = Math.round((7.4 - ph) * 15 * f * 10) / 10;
    out.push({ chemical: "Soda Ash (pH Up)", amount: String(oz), unit: "oz", reason: `pH ${ph} — target is 7.2–7.6`, urgency: "normal" });
  }
  if (ta < 80) {
    const lb = Math.round((90 - ta) * vol * 0.0000017 * 10) / 10;
    out.push({ chemical: "Sodium Bicarbonate", amount: String(lb), unit: "lbs", reason: `Alkalinity ${ta} ppm — target 80–120`, urgency: "normal" });
  }
  if (out.length === 0) {
    out.push({ chemical: "Your pool is balanced ✓", amount: "—", unit: "", reason: "No treatment needed. Keep it up!", urgency: "normal" });
  }
  return out;
}

const URGENCY_STYLES = {
  critical: "bg-red-50 border-red-200 text-red-800",
  high:     "bg-amber-50 border-amber-200 text-amber-800",
  normal:   "bg-emerald-50 border-emerald-200 text-emerald-800",
};

function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("guestId");
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("guestId", id); }
  return id;
}

export default function HomeownerCheckPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "results">("input");
  const [isPro, setIsPro] = useState(false);
  const [checksLeft, setChecksLeft] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = getGuestId();
    fetch(`/api/homeowner/usage?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.checksRemaining === "number") setChecksLeft(d.checksRemaining);
        if (d.isPro) setIsPro(true);
      })
      .catch(() => {});
  }, []);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [vals, setVals] = useState<Record<string, string>>({
    freeChlorine: "", ph: "", totalAlkalinity: "", volumeGallons: "15000",
  });

  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const dosages = calcDosages(vals);

  const handleCheck = async () => {
    if (!vals.freeChlorine || !vals.ph) return;
    setLoading(true);
    const userId = getGuestId();
    try {
      const res = await fetch("/api/homeowner/usage", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, isPro }),
      });
      const d = await res.json();
      if (!d.allowed) {
        setLoading(false);
        router.push("/homeowner?upgrade=true");
        return;
      }
      setChecksLeft(d.checksRemaining ?? 0);
    } catch {}
    // Save reading to localStorage history
    try {
      const existing = JSON.parse(localStorage.getItem("chemHistory") ?? "[]");
      const newReading = {
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cl:   parseFloat(vals.freeChlorine),
        ph:   parseFloat(vals.ph),
        ...(vals.totalAlkalinity ? { ta: parseFloat(vals.totalAlkalinity) } : {}),
      };
      localStorage.setItem("chemHistory", JSON.stringify([newReading, ...existing].slice(0, 20)));
    } catch {}

    setLoading(false);
    setStep("results");
  };

  const getAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/chemistry/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vals),
      });
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch {
      setAiAnalysis("Add your ANTHROPIC_API_KEY to enable AI analysis.");
    } finally {
      setAiLoading(false);
    }
  };

  if (step === "input") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-br from-pool-700 to-teal-600 text-white px-5 pt-12 pb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Waves className="w-6 h-6" />
            <h1 className="text-xl font-bold">Chemistry Check</h1>
          </div>
          <p className="text-white/70 text-sm">
            Enter your test strip or kit readings for instant AI-calculated dosages
          </p>
          {!isPro && (
            <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 text-sm text-center">
              {checksLeft} free check remaining this week
            </div>
          )}
        </div>

        <div className="px-4 mt-4 space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Enter your readings</h2>
            <div className="space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">{f.label}</label>
                    {f.target && <span className="text-xs text-slate-400">Target: {f.target} {f.unit}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input flex-1"
                      placeholder={f.placeholder}
                      value={vals[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      step="0.1"
                    />
                    {f.unit && <span className="text-sm text-slate-400 w-10">{f.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#e8f1fc] border border-teal-200 rounded-xl p-3 flex gap-2.5">
            <Zap className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-teal-800">
              Use test strips or a liquid test kit to get your readings. Find them at any pool supply store or Amazon.
            </p>
          </div>

          <button
            onClick={handleCheck}
            disabled={!vals.freeChlorine || !vals.ph || loading}
            className="btn-primary w-full"
          >
            {loading ? "Calculating..." : "Get My Dosage Plan"}
          </button>

          <p className="text-center text-xs text-slate-400 pb-8">
            Dosages are calculated for US measurements (oz, fl oz, lbs, gallons)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-pool-700 to-teal-600 text-white px-5 pt-12 pb-8">
        <button onClick={() => setStep("input")} className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-bold mb-1">Your Treatment Plan</h1>
        <p className="text-white/70 text-sm">Based on your readings — US units</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Dosages */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-4">What to add</h2>
          <div className="space-y-3">
            {dosages.map((d, i) => (
              <div key={i} className={`border rounded-xl p-3 ${URGENCY_STYLES[d.urgency]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{d.chemical}</p>
                    <p className="text-xs mt-0.5 opacity-80">{d.reason}</p>
                  </div>
                  {d.amount !== "—" && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold font-mono">{d.amount}</p>
                      <p className="text-xs opacity-70">{d.unit}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Add chemicals one at a time, 15 minutes apart. Never mix chemicals together. Run your pump while adding. Retest after 4 hours.
          </p>
        </div>

        {/* AI analysis — gated for free users */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">AI Deep Explanation</h2>
            {isPro ? (
              <button onClick={getAI} disabled={aiLoading} className="btn-primary text-xs py-1.5 px-3">
                {aiLoading ? "Thinking..." : "Ask AI"}
              </button>
            ) : (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>

          {isPro ? (
            aiAnalysis ? (
              <p className="text-sm text-slate-700 leading-relaxed">{aiAnalysis}</p>
            ) : (
              <p className="text-sm text-slate-400">Tap "Ask AI" to get a plain-English explanation of why your pool is off and how to prevent it next time.</p>
            )
          ) : (
            <div className="relative">
              <p className="text-sm text-slate-300 leading-relaxed blur-sm select-none">
                Your pH has been trending high due to a combination of rising temperatures and increased bather load. 
                This is common in summer and usually corrects itself with weekly acid additions. The key is consistency — 
                adding a small amount of acid every week prevents the dramatic swings you're seeing.
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link href="/homeowner/upgrade">
                  <button className="flex items-center gap-2 bg-pool-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-pool-600 transition-colors">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade for AI Explanations
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* History upsell */}
        {!isPro && (
          <div className="bg-gradient-to-br from-pool-600 to-teal-600 rounded-2xl p-5 text-white mb-8">
            <h3 className="font-bold text-lg mb-1">Track your pool's health</h3>
            <p className="text-white/80 text-sm mb-4">
              Pool+ saves every reading, spots trends before they become problems, and sends you alerts when chemistry drifts.
            </p>
            <div className="space-y-2 mb-4">
              {[
                "Unlimited weekly chemistry checks",
                "Full history & trend charts",
                "AI troubleshooting explanations",
                "Seasonal maintenance reminders",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-teal-300 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/homeowner/upgrade" className="block w-full">
              <button className="w-full bg-white text-pool-700 font-bold py-3 rounded-xl hover:bg-pool-50 transition-colors">
                Start Free Trial — $9/month
              </button>
            </Link>
            <p className="text-center text-white/50 text-xs mt-2">14-day free trial. Cancel anytime.</p>
          </div>
        )}
      </div>
    </div>
  );
}
