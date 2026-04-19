"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePools, useReports, useInvoices, useMileage } from "@/hooks/useData";
import { MapPin, AlertTriangle, DollarSign, Car, Waves, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

const ROUTE_STOPS = [
  { name: "Rivera Family",       address: "2250 Sunset Ln, Mesa",     status: "complete", time: "8:45 AM" },
  { name: "Desert Oasis Resort", address: "5500 Resort Way, Gilbert", status: "complete", time: "10:20 AM" },
  { name: "Johnson Residence",   address: "1420 Maple Dr, Scottsdale",status: "current",  time: "ETA 12:05 PM" },
  { name: "Park Estates HOA",    address: "800 Park Blvd, Tempe",     status: "pending",  time: "~1:30 PM" },
  { name: "Thompson Backyard",   address: "310 Oak Ave, Chandler",    status: "pending",  time: "~2:45 PM" },
];

export default function DashboardPage() {
  const { user, company } = useAuth();
  const { data: poolsData } = usePools();
  const { data: reportsData } = useReports();
  const { data: invoicesData } = useInvoices();
  const { data: mileageData } = useMileage();

  const name = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const poolCount  = poolsData?.pools?.length ?? 47;
  const totalMiles = typeof mileageData?.totalMiles === "number"
    ? Math.round(mileageData.totalMiles * 10) / 10
    : 34.2;
  const taxDeduction = Math.round(totalMiles * 0.67 * 100) / 100;

  const reports   = reportsData?.reports ?? [];
  const invoices  = invoicesData?.invoices ?? [];
  const monthlyRev = invoices
    .filter((inv: any) => inv.status === "paid")
    .reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0) || 8240;
  const pendingReports = reports.filter((r: any) => (r.report ?? r).status === "pending").length;
  const todayStops = 12;

  const STATS = [
    { label: "Today's Stops",   value: todayStops.toString(),        sub: "3 remaining",         icon: MapPin,     color: "text-pool-600",    bg: "bg-pool-50" },
    { label: "Monthly Revenue", value: `$${monthlyRev.toLocaleString()}`, sub: "+12% vs last month",icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Pools",    value: poolCount.toString(),          sub: "2 added this week",   icon: Waves,      color: "text-[#1756a9]",    bg: "bg-[#e8f1fc]" },
    { label: "Miles Today",     value: totalMiles.toString(),         sub: `$${taxDeduction} deduction`, icon: Car, color: "text-amber-600",  bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {name} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">
          {company ? `${company.name} · ` : ""}Here's your pool business at a glance.
        </p>
      </div>

      {/* Trial banner */}
      {company?.subscriptionStatus === "trialing" && (
        <div className="bg-pool-50 border border-pool-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-pool-800">
            🎉 You're on a free trial. Add your Stripe keys in .env.local to activate subscriptions.
          </p>
          <Link href="/settings">
            <button className="btn-primary text-xs py-1.5 px-3">Choose Plan</button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <p className="stat-label">{s.label}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="stat-value">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Route */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Today's Route</h2>
            <Link href="/routes" className="text-sm text-pool-600 font-medium hover:underline">View map →</Link>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>9 of 12 stops complete</span>
              <span className="font-semibold text-pool-600">75%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pool-500 to-[#00c3e3] rounded-full" style={{ width: "75%" }} />
            </div>
          </div>
          <div className="space-y-1">
            {ROUTE_STOPS.map((stop, i) => (
              <div key={stop.name} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${stop.status === "current" ? "bg-amber-50 border border-amber-200" : "hover:bg-slate-50"}`}>
                <div className="flex-shrink-0">
                  {stop.status === "complete" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : stop.status === "current" ? (
                    <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center">
                      <span className="text-xs text-slate-400 font-bold">{i + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${stop.status === "pending" ? "text-slate-400" : "text-slate-900"}`}>{stop.name}</p>
                  <p className="text-xs text-slate-400 truncate">{stop.address}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span className="text-xs text-slate-400">{stop.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Alerts */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Alerts</h2>
            <div className="space-y-3">
              {[
                { type: "error", pool: "Park Estates HOA",  msg: "Free Cl critically low (0.8 ppm)",    href: "/chemistry" },
                { type: "warn",  pool: "Johnson Residence", msg: "pH out of range (8.4) — AI dosage ready", href: "/chemistry" },
                { type: "info",  pool: "Rivera Family",     msg: "Monthly invoice due in 3 days",         href: "/invoices"  },
              ].map((a, i) => (
                <Link key={i} href={a.href}>
                  <div className={`p-3 rounded-xl border text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                    a.type === "error" ? "bg-red-50 border-red-200"
                    : a.type === "warn" ? "bg-amber-50 border-amber-200"
                    : "bg-pool-50 border-pool-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        a.type === "error" ? "text-red-500" : a.type === "warn" ? "text-amber-500" : "text-pool-500"
                      }`} />
                      <div>
                        <p className="font-semibold text-slate-900">{a.pool}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{a.msg}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card p-5">
            <h2 className="section-title mb-4">This Month</h2>
            <div className="space-y-3">
              {[
                { label: "Pools Serviced", value: reports.length > 0 ? reports.length : 142, icon: "✅" },
                { label: "Reports Sent",   value: reports.filter((r: any) => (r.report ?? r).status === "sent").length || 138, icon: "📄" },
                { label: "Invoices Paid",  value: `$${invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.amount, 0) || "6,800"}`, icon: "💳" },
                { label: "Miles Logged",   value: `${totalMiles > 0 ? totalMiles : 487} mi`, icon: "🚗" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="text-sm text-slate-600">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
