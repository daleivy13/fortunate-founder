"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const REVENUE = [
  { month: "Nov", revenue: 6200, expenses: 1800 },
  { month: "Dec", revenue: 6800, expenses: 2100 },
  { month: "Jan", revenue: 7100, expenses: 1900 },
  { month: "Feb", revenue: 7400, expenses: 2000 },
  { month: "Mar", revenue: 7900, expenses: 2200 },
  { month: "Apr", revenue: 8240, expenses: 2100 },
];

const STOPS_BY_DAY = [
  { day: "Mon", stops: 14 },
  { day: "Tue", stops: 12 },
  { day: "Wed", stops: 16 },
  { day: "Thu", stops: 11 },
  { day: "Fri", stops: 15 },
  { day: "Sat", stops: 8 },
];

const POOL_TYPES = [
  { name: "Residential", value: 34, color: "#0ea5e9" },
  { name: "HOA", value: 8, color: "#1756a9" },
  { name: "Commercial", value: 5, color: "#6366f1" },
];

const ISSUES = [
  { issue: "pH High", count: 18 },
  { issue: "Low Chlorine", count: 14 },
  { issue: "Algae", count: 6 },
  { issue: "Filter", count: 9 },
  { issue: "Equipment", count: 4 },
];

export default function AnalyticsPage() {
  const thisMonth = REVENUE[REVENUE.length - 1];
  const lastMonth = REVENUE[REVENUE.length - 2];
  const revGrowth = (((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100).toFixed(1);
  const profit = thisMonth.revenue - thisMonth.expenses;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Business performance at a glance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Monthly Revenue", value: `$${thisMonth.revenue.toLocaleString()}`, sub: `+${revGrowth}% vs last month`, color: "text-emerald-600" },
          { label: "Net Profit", value: `$${profit.toLocaleString()}`, sub: `${Math.round(profit / thisMonth.revenue * 100)}% margin`, color: "text-pool-600" },
          { label: "Active Pools", value: "47", sub: "+2 this month", color: "text-[#1756a9]" },
          { label: "Avg Revenue / Pool", value: `$${Math.round(thisMonth.revenue / 47)}`, sub: "per month", color: "text-violet-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-5">Revenue vs Expenses — 6 Months</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={REVENUE} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name === "revenue" ? "Revenue" : "Expenses"]}
            />
            <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: "#0ea5e9" }} />
            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#f43f5e" }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-4 h-0.5 bg-pool-500 rounded" /> Revenue</div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-4 h-0.5 bg-rose-400 rounded" /> Expenses</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Stops by day */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-5">Stops by Day of Week</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={STOPS_BY_DAY} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: "1px solid #e2e8f0", borderRadius: "12px" }}
                formatter={(val: number) => [val, "Stops"]}
              />
              <Bar dataKey="stops" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pool breakdown */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-5">Pool Type Breakdown</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={POOL_TYPES} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {POOL_TYPES.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {POOL_TYPES.map((t) => (
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
                <span className="text-sm font-bold text-slate-900">47</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top issues */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-5">Top Chemistry Issues (This Month)</h2>
          <div className="space-y-3">
            {ISSUES.map((item) => (
              <div key={item.issue}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.issue}</span>
                  <span className="font-semibold text-slate-900">{item.count}x</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pool-400 to-teal-400 rounded-full"
                    style={{ width: `${(item.count / 18) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mileage & tax */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-4">Mileage & Tax Deductions</h2>
          <div className="space-y-3">
            {[
              { label: "Miles This Month", value: "487.2 mi" },
              { label: "Tax Deduction (@ $0.67/mi)", value: "$326.42" },
              { label: "Miles YTD", value: "1,842 mi" },
              { label: "YTD Deduction", value: "$1,234.14" },
              { label: "Est. Tax Savings (22% bracket)", value: "$271.51" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{s.label}</span>
                <span className="text-sm font-bold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
            💡 At your current rate, you'll save an estimated <strong>$812</strong> in taxes from mileage alone this year.
          </div>
        </div>
      </div>
    </div>
  );
}
