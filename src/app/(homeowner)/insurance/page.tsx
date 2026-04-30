"use client";

import { useState } from "react";
import { Shield, CheckCircle2, X, Loader2, ChevronRight, Star, AlertTriangle } from "lucide-react";
import { INSURANCE_TIERS, type InsuranceTier } from "@/lib/insurance/pricing";
import Link from "next/link";

type PageState = "check" | "not-eligible" | "eligible" | "quoted";

interface EligibilityResult {
  eligible:        boolean;
  score:           number;
  checks:          { key: string; label: string; passed: boolean; detail: string }[];
  roadmap:         string[];
  recommendedTier: string;
}

interface QuoteResult {
  quoteId:          number;
  tier:             InsuranceTier;
  basePrice:        number;
  finalPrice:       number;
  discounts:        { name: string; pct: number }[];
  totalDiscountPct: number;
  annualPay:        boolean;
  savingsPerYear:   number;
}

function EligibilityMeter({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">Eligibility Score</span>
        <span className="font-bold text-slate-800">{score}/100</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">60+ required for coverage</p>
    </div>
  );
}

function TierCard({ tier, recommended, onGetQuote }: { tier: InsuranceTier; recommended: boolean; onGetQuote: (tierKey: string) => void }) {
  return (
    <div className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all ${recommended ? "border-[#1756a9] shadow-lg" : "border-slate-200"}`}>
      {recommended && (
        <div className="absolute -top-3 left-4 bg-[#1756a9] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 fill-white" />Recommended
        </div>
      )}
      {tier.badge && !recommended && (
        <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">{tier.badge}</div>
      )}
      <div>
        <p className="text-lg font-bold text-slate-900">{tier.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
      </div>
      <div>
        <p className="text-3xl font-bold text-[#1756a9]">${tier.monthlyPrice}<span className="text-base font-normal text-slate-400">/mo</span></p>
        <p className="text-xs text-slate-400">or ${tier.annualPrice}/yr · Up to ${tier.coverage.toLocaleString()} coverage</p>
      </div>
      <ul className="space-y-1.5 flex-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <button onClick={() => onGetQuote(tier.key)} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${recommended ? "bg-[#1756a9] text-white hover:bg-[#1245a0]" : "border-2 border-[#1756a9] text-[#1756a9] hover:bg-[#e8f1fc]"}`}>
        Get My Quote →
      </button>
    </div>
  );
}

export default function InsurancePage() {
  const [pageState,   setPageState]   = useState<PageState>("check");
  const [checking,    setChecking]    = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [gettingQuote,setGettingQuote]= useState(false);
  const [quote,       setQuote]       = useState<QuoteResult | null>(null);
  const [annualPay,   setAnnualPay]   = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const checkEligibility = async () => {
    setChecking(true);
    const res = await fetch("/api/insurance/eligibility", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    const json = await res.json();
    setEligibility(json);
    setPageState(json.eligible ? "eligible" : "not-eligible");
    setChecking(false);
  };

  const getQuote = async (tierKey: string) => {
    setGettingQuote(true);
    const res = await fetch("/api/insurance/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierKey, annualPay }),
    });
    const json = await res.json();
    setQuote(json);
    setPageState("quoted");
    setGettingQuote(false);
  };

  const checkout = async () => {
    if (!quote?.quoteId) return;
    setCheckingOut(true);
    const res = await fetch("/api/insurance/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        successUrl: `${window.location.origin}/insurance/dashboard?activated=true`,
        cancelUrl:  window.location.href,
      }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else setCheckingOut(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1756a9] flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PoolPal Protection</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Pool liability and equipment coverage backed by your compliance data.
            Verified pool owners get up to 35% off standard rates.
          </p>
        </div>

        {/* State: initial check */}
        {pageState === "check" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              {[
                { icon: "✅", label: "Instant eligibility check" },
                { icon: "💰", label: "Up to 35% off with compliance streaks" },
                { icon: "🛡️", label: "Covers liability + equipment" },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="text-xs text-slate-500">{f.label}</p>
                </div>
              ))}
            </div>
            <button onClick={checkEligibility} disabled={checking} className="btn-primary text-base px-8 py-3 flex items-center gap-2 mx-auto">
              {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {checking ? "Checking your profile…" : "Check My Eligibility"}
            </button>
            <p className="text-xs text-slate-400 mt-3">No obligation — instant result, no credit check</p>
          </div>
        )}

        {/* State: not eligible */}
        {pageState === "not-eligible" && eligibility && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Not quite eligible yet</p>
                  <p className="text-sm text-slate-500 mt-0.5">Complete these steps to unlock coverage:</p>
                </div>
              </div>
              <EligibilityMeter score={eligibility.score} />
              <div className="mt-4 space-y-2">
                {eligibility.checks.map(c => (
                  <div key={c.key} className={`flex items-center gap-3 text-sm p-2.5 rounded-xl ${c.passed ? "bg-emerald-50" : "bg-amber-50"}`}>
                    {c.passed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <X className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <div className="flex-1">
                      <span className={`font-medium ${c.passed ? "text-emerald-700" : "text-slate-700"}`}>{c.label}</span>
                      {!c.passed && <p className="text-xs text-amber-700 mt-0.5">{c.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/onboarding" className="flex-1"><button className="btn-primary w-full">Complete Profile →</button></Link>
              <button onClick={() => setPageState("check")} className="btn-outline">Recheck</button>
            </div>
          </div>
        )}

        {/* State: eligible — show tiers */}
        {pageState === "eligible" && eligibility && (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-emerald-800">You qualify for PoolPal Protection!</p>
                <p className="text-sm text-emerald-700">Eligibility score: {eligibility.score}/100 · Choose your coverage level</p>
              </div>
            </div>

            {/* Annual toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!annualPay ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
              <button onClick={() => setAnnualPay(p => !p)} className={`w-12 h-6 rounded-full transition-all flex items-center px-0.5 ${annualPay ? "bg-[#1756a9]" : "bg-slate-300"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${annualPay ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className={`text-sm font-medium ${annualPay ? "text-slate-900" : "text-slate-400"}`}>Annual <span className="text-emerald-600 font-bold">(save 10%)</span></span>
            </div>

            {gettingQuote && (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />Building your quote…
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INSURANCE_TIERS.filter(t => t.key !== "commercial").map(tier => (
                <TierCard
                  key={tier.key}
                  tier={tier}
                  recommended={tier.key === eligibility.recommendedTier}
                  onGetQuote={getQuote}
                />
              ))}
            </div>
          </div>
        )}

        {/* State: quoted */}
        {pageState === "quoted" && quote && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-[#1756a9] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Your Quote</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{quote.tier.name} Coverage</p>
                </div>
                <div className="text-right">
                  {quote.totalDiscountPct > 0 && (
                    <p className="text-xs line-through text-slate-400">${quote.basePrice}/{quote.annualPay ? "yr" : "mo"}</p>
                  )}
                  <p className="text-3xl font-bold text-[#1756a9]">${quote.finalPrice}<span className="text-sm font-normal text-slate-400">/{quote.annualPay ? "yr" : "mo"}</span></p>
                </div>
              </div>

              {quote.discounts.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold text-emerald-700 mb-2">🎉 Your discounts ({quote.totalDiscountPct}% off):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quote.discounts.map(d => (
                      <span key={d.name} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{d.name} −{d.pct}%</span>
                    ))}
                  </div>
                  {quote.savingsPerYear > 0 && (
                    <p className="text-xs text-emerald-600 mt-2 font-semibold">Saving ${quote.savingsPerYear}/year vs. standard rates</p>
                  )}
                </div>
              )}

              <ul className="space-y-1.5 mb-5">
                {quote.tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button onClick={checkout} disabled={checkingOut} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2">
                {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                {checkingOut ? "Redirecting to checkout…" : `Activate Coverage — $${quote.finalPrice}/${quote.annualPay ? "yr" : "mo"}`}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">Quote valid for 72 hours · Cancel anytime</p>
            </div>

            <button onClick={() => setPageState("eligible")} className="btn-outline w-full text-sm">
              ← Choose a different plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
