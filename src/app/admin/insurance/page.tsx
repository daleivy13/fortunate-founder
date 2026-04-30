"use client";

import { useEffect, useState } from "react";
import { Shield, DollarSign, Users, TrendingUp, Loader2 } from "lucide-react";
import { PARTNER_PITCHES } from "@/lib/insurance/partner-pitches";

interface QuoteRow {
  id:               number;
  tier:             string;
  status:           string;
  monthly_price:    number | null;
  annual_price:     number | null;
  discount_total_pct: number;
  created_at:       string;
}

const COMMISSION_RATE = 0.20; // 20% commission on first year

export default function AdminInsurancePage() {
  const [quotes,    setQuotes]    = useState<QuoteRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showPitch, setShowPitch] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/insurance/quotes")
      .then(r => r.json())
      .then(d => { setQuotes(d.quotes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const convertedQuotes = quotes.filter(q => q.status === "active");
  const totalMRR = convertedQuotes.reduce((s, q) => s + (parseFloat(String(q.monthly_price ?? 0))), 0);
  const totalARR  = totalMRR * 12;
  const commissionARR = totalARR * COMMISSION_RATE;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-[#1756a9]" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insurance Dashboard</h1>
            <p className="text-slate-500 text-sm">Commission tracking · Partner pitches</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Quotes",   value: quotes.length.toString(),          icon: Users,     color: "text-[#1756a9]" },
            { label: "Active Policies",value: convertedQuotes.length.toString(), icon: Shield,    color: "text-emerald-600" },
            { label: "MRR",            value: `$${Math.round(totalMRR)}`,        icon: DollarSign,color: "text-[#1756a9]" },
            { label: "Comm. ARR (20%)",value: `$${Math.round(commissionARR)}`,   icon: TrendingUp,color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quote table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Recent Quotes</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : quotes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No quotes yet — share the insurance page with homeowners.</p>
            ) : (
              <div className="space-y-2">
                {quotes.slice(0, 10).map(q => (
                  <div key={q.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${q.status === "active" ? "bg-emerald-500" : q.status === "checkout_started" ? "bg-amber-400" : "bg-slate-300"}`} />
                    <span className="font-medium text-slate-800 capitalize">{q.tier}</span>
                    <span className="text-slate-400 flex-1">{q.status}</span>
                    <span className="font-bold text-slate-700">${q.monthly_price ?? q.annual_price}/mo</span>
                    <span className="text-xs text-emerald-600 font-medium">
                      {q.status === "active" ? `+$${Math.round(parseFloat(String(q.monthly_price ?? 0)) * 12 * COMMISSION_RATE)}/yr` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Partner pitches */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Partner Pitch Templates</h2>
            <div className="space-y-2">
              {PARTNER_PITCHES.map((p, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowPitch(showPitch === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">{p.partner}</span>
                    <span className="text-xs text-slate-400">{showPitch === i ? "▲" : "▼"}</span>
                  </button>
                  {showPitch === i && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-500 mb-1">Subject: {p.subject}</p>
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{p.body}</pre>
                      <button
                        onClick={() => navigator.clipboard.writeText(`Subject: ${p.subject}\n\n${p.body}`)}
                        className="mt-3 text-xs bg-[#1756a9] text-white px-3 py-1.5 rounded-lg hover:bg-[#1245a0]"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
