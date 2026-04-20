"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useAnalytics, useMileage, usePools } from "@/hooks/useData";

const POOL_COLORS = ["#0ea5e9", "#1756a9", "#6366f1"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics();
  const { data: mileageData, isLoading: loadingMileage } = useMileage();
  const { data: poolsData } = usePools();

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

  // Pool type breakdown from real pools
  const pools: any[] = poolsData?.pools ?? [];
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
          <h2 className="font-bold text-slate-900 mb-4">Mileage & Tax Deductions</h2>
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
