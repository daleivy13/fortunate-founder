"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Zap, TrendingUp, Building2, Gift, Loader2 } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    icon: Gift,
    color: "slate",
    pools: "Up to 5 pools",
    techs: "1 technician",
    badge: null,
    features: [
      "Pool tracking & chemistry calculator",
      "3 service reports per month",
      "Basic invoicing",
      "Mobile app access",
    ],
    notIncluded: ["GPS mileage tracking", "AI chemistry analysis", "Unlimited reports"],
  },
  {
    id: "solo",
    name: "Solo",
    price: 79,
    icon: Zap,
    color: "pool",
    pools: "Up to 25 pools",
    techs: "1 technician",
    badge: null,
    features: [
      "Everything in Starter",
      "Unlimited service reports + PDF",
      "GPS tracking + mileage logs",
      "AI chemistry analysis",
      "Stripe invoicing & payments",
      "Email client notifications",
    ],
    notIncluded: [],
  },
  {
    id: "growth",
    name: "Growth",
    price: 179,
    icon: TrendingUp,
    color: "teal",
    pools: "Up to 75 pools",
    techs: "5 technicians",
    badge: "Most Popular",
    features: [
      "Everything in Solo",
      "Up to 5 technicians",
      "Route optimization AI",
      "Analytics & P&L dashboard",
      "SMS client notifications",
      "Priority support",
    ],
    notIncluded: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 399,
    icon: Building2,
    color: "violet",
    pools: "Unlimited pools",
    techs: "Unlimited technicians",
    badge: null,
    features: [
      "Everything in Growth",
      "Unlimited technicians",
      "White-label reports & portal",
      "Custom branding",
      "API access",
      "Dedicated account manager",
    ],
    notIncluded: [],
  },
];

const ADDONS = [
  { id: "addon_portal",   name: "Customer Portal",     price: "$49/mo",    desc: "Clients log in to view reports and pay invoices" },
  { id: "addon_whitelabel", name: "White Label",       price: "$79/mo",    desc: "Your branding on all reports and client-facing pages" },
  { id: "addon_sms",     name: "SMS Notifications",    price: "$29/mo",    desc: "Auto-text clients on service completion and invoice due dates" },
  { id: "addon_route",   name: "Route Optimization AI",price: "$39/mo",    desc: "AI-optimized routes — cuts drive time by up to 30%" },
  { id: "addon_tax",     name: "Tax Export Pack",       price: "$49/year",  desc: "One-click export for TurboTax, H&R Block, and accountants" },
  { id: "addon_skimmer", name: "Skimmer Import",        price: "$99 once",  desc: "Import all your data from Skimmer in one click" },
];

export default function SettingsPage() {
  const { user, company, signOut, refreshCompany } = useAuth();
  const [tab, setTab] = useState<"billing" | "profile" | "addons">("billing");
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const nameRef        = useRef<HTMLInputElement>(null);
  const phoneRef       = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid:         user.uid,
          displayName: nameRef.current?.value || null,
          phone:       phoneRef.current?.value || null,
          companyName: companyNameRef.current?.value || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      await refreshCompany();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setProfileError(err.message ?? "Failed to save");
    } finally {
      setProfileSaving(false);
    }
  };

  const subscribe = async (planId: string) => {
    if (planId === "starter") return;
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          email: user?.email,
          userId: user?.uid,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Add your Stripe keys to .env.local to enable subscriptions.");
    } finally {
      setLoading(null);
    }
  };

  const annualPrice = (p: number) => Math.round(p * 12 * 0.8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription, profile, and preferences</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["billing", "addons", "profile"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "addons" ? "Add-ons" : t}
          </button>
        ))}
      </div>

      {tab === "billing" && (
        <div className="space-y-6">
          {/* Annual toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Choose your plan</h2>
              <p className="text-slate-500 text-sm">14-day free trial on paid plans. Cancel anytime.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${!annual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-11 h-6 rounded-full transition-colors ${annual ? "bg-pool-500" : "bg-slate-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-slate-900" : "text-slate-400"}`}>
                Annual <span className="text-emerald-600 font-bold">-20%</span>
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const displayPrice = annual && plan.price > 0
                ? Math.round(annualPrice(plan.price) / 12)
                : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`card p-5 relative flex flex-col ${
                    plan.badge ? "border-pool-400 border-2 shadow-md shadow-pool-100" : ""
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pool-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    plan.color === "pool" ? "bg-pool-100" :
                    plan.color === "teal" ? "bg-[#c5daf7]" :
                    plan.color === "violet" ? "bg-violet-100" : "bg-slate-100"
                  }`}>
                    <plan.icon className={`w-4 h-4 ${
                      plan.color === "pool" ? "text-pool-600" :
                      plan.color === "teal" ? "text-[#1756a9]" :
                      plan.color === "violet" ? "text-violet-600" : "text-slate-500"
                    }`} />
                  </div>

                  <h3 className="font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-3">{plan.pools} · {plan.techs}</p>

                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-slate-900">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-slate-900">${displayPrice}</span>
                        <span className="text-slate-400 text-sm">/mo</span>
                        {annual && <div className="text-xs text-emerald-600 font-semibold mt-0.5">${annualPrice(plan.price)}/yr</div>}
                      </>
                    )}
                  </div>

                  <div className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                    {plan.notIncluded.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="w-3.5 flex-shrink-0 text-center">✗</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => subscribe(plan.id)}
                    disabled={loading === plan.id || plan.id === "starter"}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      plan.badge
                        ? "bg-pool-500 text-white hover:bg-pool-600"
                        : plan.id === "starter"
                        ? "bg-slate-100 text-slate-400 cursor-default"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {loading === plan.id ? "Redirecting..."
                      : plan.id === "starter" ? "Current Plan"
                      : "Start Free Trial"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500">
              All plans include a <strong className="text-slate-700">14-day free trial</strong>. No credit card required to start.
              Payment processing on invoices: <strong className="text-slate-700">0.5% fee</strong> on top of Stripe's standard rate.
            </p>
          </div>
        </div>
      )}

      {tab === "addons" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Add-ons</h2>
            <p className="text-slate-500 text-sm">Supercharge your plan with optional features</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            {ADDONS.map((addon) => (
              <div key={addon.name} className="card p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{addon.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{addon.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 whitespace-nowrap">{addon.price}</p>
                  <button
                    disabled={loading === addon.id}
                    onClick={() => subscribe(addon.id)}
                    className="mt-2 text-xs bg-pool-50 text-pool-700 border border-pool-200 rounded-lg px-3 py-1.5 font-semibold hover:bg-pool-100 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {loading === addon.id ? "Redirecting..." : "Add to plan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="card p-6 max-w-lg space-y-4">
          <h2 className="font-bold text-slate-900">Profile</h2>

          {profileError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{profileError}</div>
          )}

          <div>
            <label className="label">Display Name</label>
            <input ref={nameRef} className="input" defaultValue={user?.displayName ?? ""} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-60 cursor-not-allowed" defaultValue={user?.email ?? ""} disabled />
          </div>
          <div>
            <label className="label">Phone</label>
            <input ref={phoneRef} className="input" placeholder="(480) 555-0000" />
          </div>
          <div>
            <label className="label">Company Name</label>
            <input ref={companyNameRef} className="input" defaultValue={company?.name ?? ""} placeholder="Sunbelt Pool Services" />
          </div>

          <button onClick={saveProfile} disabled={profileSaving} className="btn-primary">
            {profileSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : profileSaved ? "Saved ✓" : "Save Changes"}
          </button>

          <div className="pt-4 border-t border-slate-100">
            <button onClick={signOut} className="text-sm text-red-500 hover:text-red-600 font-medium">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
