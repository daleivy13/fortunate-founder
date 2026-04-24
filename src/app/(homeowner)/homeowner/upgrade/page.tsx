"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Waves, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("guestId");
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("guestId", id); }
  return id;
}

const FEATURES = [
  "Unlimited weekly chemistry checks",
  "Full history & trend charts",
  "AI troubleshooting explanations",
  "Seasonal maintenance reminders",
  "Priority email support",
];

export default function HomeownerUpgradePage() {
  const router = useRouter();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/homeowner/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, guestId: getGuestId() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-[#1756a9] to-[#00c3e3] text-white px-5 pt-12 pb-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Waves className="w-7 h-7" />
          <span className="font-bold text-xl">PoolPal</span>
        </div>
        <h1 className="text-3xl font-bold mb-1">Pool+ Membership</h1>
        <p className="text-white/80 text-sm">Everything you need to keep your pool perfect year-round.</p>
        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-5xl font-bold">$9</span>
          <span className="text-white/70">/month</span>
        </div>
        <p className="text-white/60 text-xs mt-1">14-day free trial · Cancel anytime</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-4">What's included</h2>
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleUpgrade} className="card p-5 space-y-4">
          <h2 className="font-bold text-slate-900">Start your free trial</h2>
          <p className="text-sm text-slate-500">
            Enter your email to get started. No credit card required for the 14-day trial.
          </p>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout...</>
              : "Start Free 14-Day Trial →"}
          </button>
          <p className="text-center text-xs text-slate-400">
            Secure checkout powered by Stripe · Cancel anytime from your account
          </p>
        </form>
      </div>
    </div>
  );
}
