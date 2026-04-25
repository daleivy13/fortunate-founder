"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Waves, FileText, Receipt, CheckCircle2, Lock } from "lucide-react";

// Customer portal — accessed via unique link sent by pool company
// URL format: /customers/portal?token=<jwt_token>
// Token encodes: companyId, poolId, clientEmail

function CustomerPortalContent() {
  const params    = useSearchParams();
  const token     = params.get("token");
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"reports"|"invoices">("reports");
  const [paying,  setPaying]  = useState<number | null>(null);

  const handlePay = async (invoiceId: number) => {
    setPaying(invoiceId);
    try {
      const res = await fetch("/api/portal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "pay", token, invoiceId }),
      });
      const { paymentUrl, error } = await res.json();
      if (paymentUrl) window.open(paymentUrl, "_blank");
      else alert(error ?? "Payment unavailable");
    } finally {
      setPaying(null);
    }
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    // Fetch data using the portal token
    fetch(`/api/portal?token=${token}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: "Invalid or expired link" }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || data?.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="card p-8 max-w-sm w-full text-center">
          <Lock className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-500 text-sm">This link has expired or is invalid. Contact your pool service company for a new link.</p>
        </div>
      </div>
    );
  }

  const pool       = data?.pool     ?? { name: "Your Pool", address: "—" };
  const company    = data?.company  ?? { name: "Your Pool Service" };
  const reports    = data?.reports  ?? [];
  const invoices   = data?.invoices ?? [];
  const latestChem = data?.latestChem ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl overflow-hidden">
          <img src="/logo.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">{company.name}</p>
          <p className="text-xs text-slate-400">Client Portal · {pool.name}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Pool status */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Your Pool</p>
          <h1 className="font-bold text-slate-900 text-lg">{pool.name}</h1>
          <p className="text-sm text-slate-400">{pool.address}</p>

          {latestChem && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label:"Free Chlorine", value:`${latestChem.freeChlorine} ppm`, ok: latestChem.freeChlorine >= 1 && latestChem.freeChlorine <= 4 },
                { label:"pH",            value:String(latestChem.ph),            ok: latestChem.ph >= 7.2 && latestChem.ph <= 7.6 },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <p className={`text-lg font-bold ${s.ok ? "text-emerald-700" : "text-amber-700"}`}>{s.value}</p>
                  <p className={`text-xs ${s.ok ? "text-emerald-500" : "text-amber-500"}`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(["reports","invoices"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {new Date(r.servicedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-400">Service Report #{r.id}</p>
                  </div>
                  <span className="badge-green">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[["Skimmed","skimmed"],["Brushed","brushed"],["Vacuumed","vacuumed"],["Filter","filterCleaned"],["Chemicals","chemicalsAdded"]].map(([l,k]) => (
                    <span key={k} className={`text-xs px-2 py-0.5 rounded-full font-medium ${(r as any)[k] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}>{l}</span>
                  ))}
                </div>
                {r.techNotes && <p className="text-xs text-slate-500 italic">"{r.techNotes}"</p>}
                <a href={`/api/reports/${r.id}/pdf?token=${token}`} target="_blank" rel="noopener noreferrer" className="btn-outline w-full text-xs mt-3 py-2 text-center block">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Invoices */}
        {tab === "invoices" && (
          <div className="space-y-3">
            {invoices.map((inv: any) => {
              const items = JSON.parse(inv.lineItems ?? "[]");
              const isPaid = inv.status === "paid";
              return (
                <div key={inv.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900 text-lg">${inv.amount}</p>
                      <p className="text-xs text-slate-400">Due {inv.dueDate}</p>
                    </div>
                    <span className={isPaid ? "badge-green" : "badge-amber"}>
                      {isPaid ? "Paid" : "Due"}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600 mb-4">
                    {items.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{i.desc}</span>
                        <span className="font-semibold">${i.rate}</span>
                      </div>
                    ))}
                  </div>
                  {!isPaid && (
                    <button
                      onClick={() => handlePay(inv.id)}
                      disabled={paying === inv.id}
                      className="btn-primary w-full text-sm py-2.5"
                    >
                      <Receipt className="w-4 h-4" />
                      {paying === inv.id ? "Redirecting..." : `Pay $${inv.amount} Securely`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading portal...</div>
      </div>
    }>
      <CustomerPortalContent />
    </Suspense>
  );
}
