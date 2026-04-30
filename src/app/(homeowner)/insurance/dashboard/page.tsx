"use client";

import { useEffect, useState } from "react";
import { Shield, CheckCircle2, Calendar, DollarSign, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Policy {
  id:             number;
  tier:           string;
  status:         string;
  monthlyPrice:   number;
  startsAt:       string;
  endsAt:         string | null;
}

const TIER_LABEL: Record<string, string> = {
  essential: "Essential",
  standard:  "Standard",
  premium:   "Premium",
  estate:    "Estate+",
  commercial:"Commercial",
};

export default function InsuranceDashboardPage() {
  const searchParams = useSearchParams();
  const [policy,   setPolicy]   = useState<Policy | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activated,setActivated]= useState(false);

  useEffect(() => {
    if (searchParams.get("activated") === "true") setActivated(true);
    // In production: fetch /api/insurance/policy to get active policy
    // For now simulate a loaded policy
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1756a9]" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-lg mx-auto text-center space-y-4">
          {activated && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <p className="font-bold text-emerald-800">🎉 Coverage activated! Welcome to PoolPal Protection.</p>
            </div>
          )}
          <Shield className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-700">No active policy</h2>
          <p className="text-slate-500 text-sm">You don't have an active PoolPal Protection policy yet.</p>
          <Link href="/insurance">
            <button className="btn-primary">Get Coverage →</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        {activated && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="font-bold text-emerald-800">🎉 Coverage activated! Welcome to PoolPal Protection.</p>
          </div>
        )}

        {/* Policy header */}
        <div className="bg-[#1756a9] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6" />
            <div>
              <p className="font-bold text-lg">{TIER_LABEL[policy.tier] ?? policy.tier} Coverage</p>
              <p className="text-blue-200 text-sm">Policy #{policy.id} · Active</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">${policy.monthlyPrice}</p>
              <p className="text-xs text-blue-200">per month</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-sm font-bold">{new Date(policy.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              <p className="text-xs text-blue-200">started</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-0.5" />
              <p className="text-xs text-blue-200">active</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/insurance">
            <button className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-[#1756a9] transition-colors">
              <DollarSign className="w-5 h-5 text-[#1756a9] mb-2" />
              <p className="text-sm font-bold text-slate-900">Upgrade Plan</p>
              <p className="text-xs text-slate-400">View higher tiers</p>
            </button>
          </Link>
          <Link href="/compliance">
            <button className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-emerald-300 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-900">Stay Compliant</p>
              <p className="text-xs text-slate-400">Protect discounts</p>
            </button>
          </Link>
        </div>

        {/* Compliance reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Keep your coverage active</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Coverage can be suspended if your pool is non-compliant for 14+ days.
              Log chemistry readings weekly to maintain full coverage.
            </p>
            <Link href="/diagnostic">
              <button className="mt-2 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-600">
                Check Pool Health →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
