"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Minus, Download, Users, DollarSign } from "lucide-react";
import { useAnalytics, useMileage, usePools, useInvoices } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const POOL_COLORS = ["#0ea5e9", "#1756a9", "#6366f1"];
const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-600 bg-emerald-50",
  B: "text-blue-600 bg-blue-50",
  C: "text-amber-600 bg-amber-50",
  D: "text-orange-600 bg-orange-50",
  F: "text-red-600 bg-red-50",
};

export default function AnalyticsPage() {
  const { company } = useAuth();
  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics();
  const { data: mileageData, isLoading: loadingMileage } = useMileage();
  const { data: poolsData } = usePools();
  const { data: invoicesData } = useInvoices();
  const { data: healthData } = useQuery({
    queryKey: ["client-health", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/health?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  const isLoading = loadingAnalytics || loadingMileage;

  // Real KPI values
  const totalRevenue  = analytics?.totalRevenue ?? 0;
  const poolCount     = analytics?.poolCount ?? poolsData?.pools?.length ?? 0;
  const reportCount   = analytics?.reportCount ?? 0;
  const avgPerPool    = poolCount > 0 ? Math.round(totalRevenue / poolCount) : 0;

  // Mileage (totalMiles = lifetime total from the mileage API)
  const totalMiles   = Number(mileageData?.totalMiles ?? 0);
  const taxDeduction = Math.round(totalMiles * 0.67 * 100) / 100;
  const estSavings   = Math.round(taxDeduction * 0.22 * 100) / 100;

  // Declare invoices + pools early so exportTaxCSV and monthlyRevenue can reference them
  const invoices: any[] = invoicesData?.invoices ?? [];
  const allPools: any[] = poolsData?.pools ?? [];

  const exportTaxCSV = () => {
    const mileageLogs: any[] = mileageData?.logs ?? [];
    const paidInvoices = invoices.filter((i: any) => i.status === "paid");

    const rows: string[][] = [["Date", "Type", "Description", "Miles", "Deduction Rate", "Tax Deduction", "Revenue"]];

    for (const log of mileageLogs) {
      rows.push([
        log.date ?? log.created_at?.slice(0, 10) ?? "",
        "Mileage",
        log.purpose ?? "Pool service route",
        String(log.miles ?? 0),
        "0.67",
        String(Math.round((log.miles ?? 0) * 0.67 * 100) / 100),
        "",
      ]);
    }

    for (const inv of paidInvoices) {
      rows.push([
        inv.paidAt?.slice(0, 10) ?? inv.created_at?.slice(0, 10) ?? "",
        "Revenue",
        `Invoice #${inv.id} — ${inv.clientName}`,
        "",
        "",
        "",
        String(parseFloat(inv.amount ?? 0).toFixed(2)),
      ]);
    }

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `poolpal-tax-export-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Monthly revenue chart — group paid invoices by month
  const monthlyRevenue = (() => {
    const byMonth: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status !== "paid") continue;
      const d = new Date(inv.paidAt ?? inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + parseFloat(inv.amount ?? 0);
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: Math.round(revenue),
      }));
  })();

  // Per-pool profitability — revenue from paid invoices per pool vs monthly rate
  const poolProfitability = allPools
    .filter(p => p.monthlyRate)
    .map(p => {
      const poolInvoices = invoices.filter(inv => inv.poolId === p.id || inv.pool_id === p.id);
      const earned = poolInvoices.filter(inv => inv.status === "paid").reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0);
      const rate = p.monthlyRate ?? 0;
      // Rough chemical cost estimate: $25/visit baseline
      const visits = poolInvoices.length;
      const estChemCost = visits * 25;
      const margin = rate > 0 ? Math.round(((rate - estChemCost / Math.max(visits, 1)) / rate) * 100) : null;
      return { name: p.name, clientName: p.clientName, rate, earned, visits, margin };
    })
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));

  // Pool type breakdown from real pools
  const pools: any[] = allPools;
  const poolTypes = [
    { name: "Residential", value: pools.filter((p) => p.type === "residential" || !p.type).length, color: POOL_COLORS[0] },
    { name: "HOA",         value: pools.filter((p) => p.type === "hoa").length,                    color: POOL_COLORS[1] },
    { name: "Commercial",  value: pools.filter((p) => p.type === "commercial").length,              color: POOL_COLORS[2] },
  ].filter((t) => t.value > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Business performance at a glance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",      value: `$${totalRevenue.toLocaleString()}`,  sub: `${reportCount} reports logged`,  color: "text-emerald-600" },
          { label: "Active Pools",       value: poolCount.toString(),                  sub: "currently tracked",              color: "text-pool-600"    },
          { label: "Service Reports",    value: reportCount.toString(),                sub: "all time",                       color: "text-[#1756a9]"   },
          { label: "Avg Revenue / Pool", value: `$${avgPerPool.toLocaleString()}`,     sub: "lifetime average",               color: "text-violet-600"  },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pool type breakdown */}
        {poolTypes.length > 0 ? (
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-5">Pool Type Breakdown</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={poolTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {poolTypes.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {poolTypes.map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                      <span className="text-sm text-slate-600">{t.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{t.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-sm font-bold text-slate-900">{poolCount}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-5 flex items-center justify-center text-slate-400 text-sm">
            Add pools to see type breakdown
          </div>
        )}

        {/* Mileage & tax */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Mileage & Tax Deductions</h2>
            <button onClick={exportTaxCSV} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total Miles Logged",              value: `${totalMiles.toFixed(1)} mi`         },
              { label: "Tax Deduction (@ $0.67/mi)",   value: `$${taxDeduction.toFixed(2)}`          },
              { label: "Est. Tax Savings (22% bracket)", value: `$${estSavings.toFixed(2)}`          },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{s.label}</span>
                <span className="text-sm font-bold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
          {taxDeduction > 0 && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              Your logged mileage saves an estimated <strong>${estSavings.toFixed(2)}</strong> in taxes (22% bracket).
            </div>
          )}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {monthlyRevenue.length > 1 && (
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-5">Monthly Revenue (Last 12 Months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#1756a9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-pool profitability */}
      {poolProfitability.length > 0 && (
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">Pool Profitability</h2>
            <p className="text-xs text-slate-400 mt-0.5">Based on monthly rate vs estimated chemical cost ($25/visit). Add actual costs in reports for exact margins.</p>
          </div>
          <div className="space-y-3">
            {poolProfitability.map((pool) => {
              const margin = pool.margin ?? 0;
              const isHigh = margin >= 70;
              const isLow  = margin < 40;
              return (
                <div key={pool.name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-slate-900 truncate">{pool.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{pool.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-500">${pool.rate}/mo</span>
                        {pool.margin !== null && (
                          <span className={`text-xs font-bold flex items-center gap-0.5 ${isHigh ? "text-emerald-600" : isLow ? "text-red-500" : "text-amber-600"}`}>
                            {isHigh ? <TrendingUp className="w-3 h-3" /> : isLow ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {margin}% margin
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isHigh ? "bg-emerald-500" : isLow ? "bg-red-400" : "bg-amber-400"}`}
                        style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            💡 Pools below 40% margin may need a rate increase. Log actual chemical costs in service reports for exact figures.
          </p>
        </div>
      )}

      {/* Client Health Score Section */}
      {(healthData?.clients ?? []).length > 0 && (() => {
        const clients: any[] = healthData.clients;
        const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        for (const c of clients) gradeCounts[c.grade] = (gradeCounts[c.grade] ?? 0) + 1;
        const avgScore = Math.round(clients.reduce((s: number, c: any) => s + c.score, 0) / clients.length);
        const fGrade   = clients.filter((c: any) => c.grade === "F");
        const aGrade   = clients.filter((c: any) => c.grade === "A");
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-pool-600" /> Client Health Scores</h2>
                <p className="text-xs text-slate-400 mt-0.5">Based on payment history, chemistry consistency, and service frequency</p>
              </div>
              <span className="text-2xl font-bold text-pool-600">{avgScore}<span className="text-sm text-slate-400 font-normal">/100 avg</span></span>
            </div>
            <div className="flex gap-2 mb-5 flex-wrap">
              {Object.entries(gradeCounts).filter(([, v]) => v > 0).map(([g, count]) => (
                <div key={g} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${GRADE_COLORS[g]}`}>
                  <span className="text-sm font-bold">{g}</span>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {fGrade.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-700 mb-2">⚠ At-Risk Clients ({fGrade.length})</p>
                  <div className="space-y-2">
                    {fGrade.slice(0, 5).map((c: any) => (
                      <Link key={c.poolId} href={`/pools/${c.poolId}`}>
                        <div className="flex items-center justify-between py-1.5 px-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.clientName}</p>
                            {c.flags?.[0] && <p className="text-xs text-red-600">{c.flags[0]}</p>}
                          </div>
                          <span className="text-xs font-bold text-red-700">{c.score}/100</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {aGrade.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-700 mb-2">⭐ Top Clients ({aGrade.length})</p>
                  <div className="space-y-2">
                    {aGrade.slice(0, 5).map((c: any) => (
                      <Link key={c.poolId} href={`/pools/${c.poolId}`}>
                        <div className="flex items-center justify-between py-1.5 px-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                          <p className="text-sm font-medium text-slate-900">{c.clientName}</p>
                          <span className="text-xs font-bold text-emerald-700">{c.score}/100</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Rate Review Section */}
      {allPools.filter(p => p.monthlyRate && p.monthlyRate < 175).length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> Rate Review</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pools priced below market average — consider a rate increase</p>
            </div>
          </div>
          <div className="space-y-2">
            {allPools
              .filter(p => p.monthlyRate && p.monthlyRate < 175)
              .sort((a, b) => (a.monthlyRate ?? 0) - (b.monthlyRate ?? 0))
              .slice(0, 8)
              .map((p: any) => (
                <Link key={p.id} href={`/pools/${p.id}`}>
                  <div className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">${p.monthlyRate}/mo</p>
                      <p className="text-xs text-slate-400">+${175 - p.monthlyRate} to market avg</p>
                    </div>
                  </div>
                </Link>
              ))
            }
          </div>
          <p className="text-xs text-slate-400 mt-3">💡 Market average: $175/month. Open a pool to generate an AI rate increase email.</p>
        </div>
      )}

      {/* Empty state if no data */}
      {poolCount === 0 && (
        <div className="card p-8 text-center text-slate-400">
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Add pools and log services to see analytics here</p>
        </div>
      )}
    </div>
  );
}
