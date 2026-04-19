"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Gift, Copy, Check, Users, DollarSign, Share2 } from "lucide-react";

export default function ReferralPage() {
  const { user } = useAuth();
  const [data,    setData]    = useState<any>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/referral?userId=${user.uid}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  const copyLink = async () => {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!data?.referralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "Try PoolPal AI free",
        text:  "I use PoolPal AI to manage my pool routes — check it out, 14 days free:",
        url:   data.referralLink,
      });
    } else {
      copyLink();
    }
  };

  const stats = data?.stats ?? { pending: 0, paid: 0, total_credit: 0 };
  const referrals: any[] = data?.referrals ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gift className="w-6 h-6 text-[#1756a9]" />
          Refer & Earn
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Earn $50 account credit for every pool company you refer who subscribes.
        </p>
      </div>

      {/* Hero */}
      <div className="card p-6 text-center bg-gradient-to-br from-[#1756a9] to-[#00c3e3] border-0">
        <p className="text-blue-100 text-sm font-medium mb-1">You earn</p>
        <p className="text-5xl font-bold text-white mb-1">$50</p>
        <p className="text-blue-100 text-sm">account credit per referral who subscribes</p>
        <p className="text-blue-200 text-xs mt-2">No limit. Stack credits. Use on any plan.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: stats.pending, icon: Users,        color: "text-amber-600",  bg: "bg-amber-50" },
          { label: "Paid",    value: stats.paid,    icon: Check,        color: "text-emerald-600",bg: "bg-emerald-50" },
          { label: "Credit",  value: `$${stats.total_credit ?? 0}`, icon: DollarSign, color: "text-[#1756a9]", bg: "bg-[#e8f1fc]" },
        ].map((s) => (
          <div key={s.label} className="stat-card text-center">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="stat-value text-xl">{s.value}</p>
            <p className="stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-3">Your referral link</h2>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 font-mono truncate">
            {loading ? "Loading..." : data?.referralLink ?? "—"}
          </div>
          <button onClick={copyLink} className="btn-secondary px-4">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={shareLink} className="btn-primary px-4">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Your code: <span className="font-mono font-bold">{data?.referralCode ?? "..."}</span>
        </p>
      </div>

      {/* How it works */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-4">How it works</h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Share your link", desc: "Send your referral link to other pool service companies. Works via text, email, Facebook, or in person at the supply store." },
            { step: "2", title: "They sign up free", desc: "Your referral starts a 14-day free trial — no credit card needed. You're credited when they become a paying subscriber." },
            { step: "3", title: "You earn $50 credit", desc: "When they make their first monthly payment, $50 is added to your account. Use it on any plan or add-on." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#c5daf7] text-[#1756a9] font-bold text-sm flex items-center justify-center flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best messages */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-4">Ready-to-send messages</h2>
        <div className="space-y-3">
          {[
            {
              label: "Text message",
              msg: `Hey! I use PoolPal AI to manage my pool routes — it does GPS tracking, AI chemistry dosages, and auto-generates PDF reports. 14 days free: ${data?.referralLink ?? "poolpalai.com"}`,
            },
            {
              label: "Facebook group post",
              msg: `Any pool techs looking for a better route app? I switched to PoolPal AI and it saves me hours every week. Tracks mileage for taxes, calculates chemical doses based on weather, sends PDF reports to clients automatically. 14 days free: ${data?.referralLink ?? "poolpalai.com"}`,
            },
          ].map((m) => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{m.label}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(m.msg); }}
                  className="text-xs text-[#1756a9] font-medium hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{m.msg}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-4">Referral history</h2>
          <div className="space-y-2">
            {referrals.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.referee_email}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`badge ${r.status === "paid" ? "badge-green" : "badge-amber"}`}>
                  {r.status === "paid" ? `+$50 earned` : "Trial active"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
