"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePools, useReports, useInvoices, useMileage } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertTriangle, DollarSign, Car, Waves, CheckCircle2, Clock, PartyPopper, Wrench, CalendarDays, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DAYS      = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage() {
  const { user, company } = useAuth();
  const searchParams = useSearchParams();
  const [showSubBanner, setShowSubBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      setShowSubBanner(true);
      // Clear the param from URL without navigation
      window.history.replaceState({}, "", "/dashboard");
      setTimeout(() => setShowSubBanner(false), 8000);
    }
  }, [searchParams]);
  const { data: poolsData } = usePools();
  const { data: reportsData } = useReports();
  const { data: invoicesData } = useInvoices();
  const { data: mileageData } = useMileage();
  const { data: woData } = useQuery({
    queryKey: ["work-orders", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders?companyId=${company!.id}`);
      return res.json() as Promise<{ workOrders: any[] }>;
    },
    enabled: !!company?.id,
  });

  const name = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const pools: any[]    = poolsData?.pools ?? [];
  const reports: any[]  = reportsData?.reports ?? [];
  const invoices: any[] = invoicesData?.invoices ?? [];

  // Today's pools (those with matching service day)
  const todayName = DAYS[new Date().getDay()];
  const todayPools = pools.filter((p) => p.serviceDay === todayName);
  const todayStops = todayPools.length;

  const totalMiles   = typeof mileageData?.totalMiles === "number" ? Math.round(mileageData.totalMiles * 10) / 10 : 0;
  const taxDeduction = Math.round(totalMiles * 0.67 * 100) / 100;

  const monthlyRev = invoices
    .filter((inv: any) => inv.status === "paid")
    .reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0);

  // Low chemistry alerts — from latest reports
  const chemAlerts = reports
    .slice(0, 20)
    .filter((item: any) => {
      const r = item.report ?? item;
      return r.issuesFound;
    })
    .slice(0, 2)
    .map((item: any) => {
      const r = item.report ?? item;
      const pool = item.pool;
      return { pool: pool?.name ?? `Pool #${r.poolId}`, msg: r.issuesFound, href: "/chemistry" };
    });

  // Upcoming invoice alert
  const dueInvoice = invoices.find((inv: any) => inv.status === "sent");
  if (dueInvoice) {
    chemAlerts.push({ pool: dueInvoice.clientName, msg: "Invoice awaiting payment", href: "/invoices" });
  }

  const { data: equipData } = useQuery({
    queryKey: ["all-equipment-alerts", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });
  const allEquipment: any[] = equipData?.equipment ?? [];
  const equipAlerts = allEquipment.filter((e: any) => {
    const last      = e.lastServicedAt || e.last_serviced_at ? new Date(e.lastServicedAt || e.last_serviced_at) : null;
    const interval  = e.serviceIntervalDays || e.service_interval_days ? parseInt(e.serviceIntervalDays || e.service_interval_days) : null;
    const nextDate  = last && interval ? new Date(last.getTime() + interval * 86400000) : null;
    const daysLeft  = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / 86400000) : null;
    return daysLeft !== null && daysLeft <= 14;
  });

  const workOrders: any[] = woData?.workOrders ?? [];
  const openWOs   = workOrders.filter(w => w.status === "pending" || w.status === "in_progress").length;
  const urgentWOs = workOrders.filter(w => w.priority === "urgent" && w.status !== "complete" && w.status !== "cancelled").length;
  if (urgentWOs > 0) {
    chemAlerts.push({ pool: `${urgentWOs} urgent work order${urgentWOs !== 1 ? "s" : ""}`, msg: "Needs immediate attention", href: "/work-orders" });
  }

  // Invoice aging
  const now30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now60  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const overdue30 = invoices.filter((i: any) => i.status === "overdue" && new Date(i.createdAt) > now60 && new Date(i.createdAt) < now30).length;
  const overdue60 = invoices.filter((i: any) => i.status === "overdue" && new Date(i.createdAt) < now60).length;

  const STATS = [
    { label: "Today's Stops",   value: todayStops > 0 ? todayStops.toString() : pools.length > 0 ? pools.length.toString() : "—", sub: todayStops > 0 ? `${todayStops} scheduled today` : "Set service days on pools", icon: MapPin,     color: "text-pool-600",    bg: "bg-pool-50" },
    { label: "Monthly Revenue", value: monthlyRev > 0 ? `$${monthlyRev.toLocaleString()}` : "—",                                  sub: "from paid invoices",                                                                              icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Pools",    value: pools.length.toString(),                                                                     sub: `${pools.filter((p) => p.type === "residential" || !p.type).length} residential`,                  icon: Waves,      color: "text-[#1756a9]",   bg: "bg-[#e8f1fc]" },
    { label: "Miles Today",     value: totalMiles > 0 ? totalMiles.toString() : "—",                                               sub: totalMiles > 0 ? `$${taxDeduction} deduction` : "Start GPS to track",                            icon: Car,        color: "text-amber-600",  bg: "bg-amber-50" },
  ];

  // Route stops: today's pools first, then next 5 as upcoming
  const displayStops = (todayPools.length > 0 ? todayPools : pools.slice(0, 5)).map((p: any, i: number) => ({
    name: p.clientName ?? p.name,
    address: p.address,
    status: i === 0 ? "current" : "pending",
    time: i === 0 ? "Next stop" : "Pending",
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {showSubBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Welcome to PoolPal AI! Your subscription is active.</p>
          </div>
          <button onClick={() => setShowSubBanner(false)} className="text-emerald-500 text-lg leading-none px-1">×</button>
        </div>
      )}
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

          {displayStops.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No stops yet</p>
              <p className="text-xs mt-1">Add pools and set service days to build your route</p>
              <Link href="/pools/new"><button className="btn-primary mt-4 text-sm">+ Add Pool</button></Link>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>{displayStops.length} stop{displayStops.length !== 1 ? "s" : ""} on today's route</span>
                  <Link href="/routes" className="font-semibold text-pool-600">View all →</Link>
                </div>
              </div>
              <div className="space-y-1">
                {displayStops.map((stop, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${stop.status === "current" ? "bg-amber-50 border border-amber-200" : "hover:bg-slate-50"}`}>
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
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Alerts */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Alerts</h2>
            {chemAlerts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No alerts — all clear!</p>
            ) : (
              <div className="space-y-3">
                {chemAlerts.map((a, i) => (
                  <Link key={i} href={a.href}>
                    <div className="p-3 rounded-xl border text-sm cursor-pointer hover:opacity-80 transition-opacity bg-amber-50 border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <div>
                          <p className="font-semibold text-slate-900">{a.pool}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{a.msg}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="card p-5">
            <h2 className="section-title mb-4">This Month</h2>
            <div className="space-y-3">
              {[
                { label: "Pools Serviced",  value: reports.length,                                                                              icon: "✅" },
                { label: "Reports Sent",    value: reports.filter((r: any) => (r.report ?? r).status === "sent").length,                        icon: "📄" },
                { label: "Invoices Paid",   value: `$${invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.amount ?? 0), 0).toLocaleString()}`, icon: "💳" },
                { label: "Miles Logged",    value: totalMiles > 0 ? `${totalMiles} mi` : "—",                                                   icon: "🚗" },
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

          {/* Work Orders widget */}
          {openWOs > 0 && (
            <Link href="/work-orders">
              <div className="card p-5 hover:border-pool-300 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-title flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-pool-600" /> Work Orders
                  </h2>
                  <span className="text-xs text-pool-600 font-medium">View all →</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 text-center bg-amber-50 rounded-xl py-2.5">
                    <p className="text-lg font-bold text-amber-700">{openWOs}</p>
                    <p className="text-xs text-slate-400">Open</p>
                  </div>
                  {urgentWOs > 0 && (
                    <div className="flex-1 text-center bg-red-50 rounded-xl py-2.5">
                      <p className="text-lg font-bold text-red-600">{urgentWOs}</p>
                      <p className="text-xs text-slate-400">Urgent</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* AR Aging */}
          {(overdue30 > 0 || overdue60 > 0) && (
            <Link href="/invoices">
              <div className="card p-5 hover:border-red-200 transition-colors cursor-pointer">
                <h2 className="section-title mb-3 text-red-600">Overdue Invoices</h2>
                <div className="space-y-2">
                  {overdue30 > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">30–60 days</span>
                      <span className="font-bold text-amber-600">{overdue30} invoice{overdue30 !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {overdue60 > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">60+ days</span>
                      <span className="font-bold text-red-600">{overdue60} invoice{overdue60 !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Equipment Alerts */}
          {equipAlerts.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" /> Equipment Alerts
                </h2>
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{equipAlerts.length}</span>
              </div>
              <div className="space-y-2">
                {equipAlerts.slice(0, 3).map((e: any) => {
                  const last     = e.lastServicedAt || e.last_serviced_at ? new Date(e.lastServicedAt || e.last_serviced_at) : null;
                  const interval = e.serviceIntervalDays || e.service_interval_days ? parseInt(e.serviceIntervalDays || e.service_interval_days) : null;
                  const nextDate = last && interval ? new Date(last.getTime() + interval * 86400000) : null;
                  const daysLeft = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / 86400000) : null;
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${daysLeft !== null && daysLeft < 0 ? "bg-red-500" : "bg-amber-400"}`} />
                      <span className="truncate text-slate-700">{e.brand} {e.model}</span>
                      <span className={`ml-auto text-xs font-medium flex-shrink-0 ${daysLeft !== null && daysLeft < 0 ? "text-red-600" : "text-amber-600"}`}>
                        {daysLeft !== null && daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Schedule */}
      {pools.some(p => p.serviceDay) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-pool-600" />This Week's Schedule
            </h2>
            <Link href="/routes" className="text-xs text-pool-600 font-medium hover:underline">Open routes →</Link>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day, dayIdx) => {
              const dayPools = pools.filter(p => p.serviceDay === day);
              const isToday  = dayIdx === new Date().getDay();
              return (
                <div key={day} className={`rounded-xl p-2.5 min-h-[80px] ${isToday ? "bg-pool-50 border border-pool-200" : "bg-slate-50"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 text-center ${isToday ? "text-pool-700" : "text-slate-400"}`}>
                    {DAY_NAMES[dayIdx]}
                    {isToday && <span className="ml-1 text-[8px] bg-pool-500 text-white rounded px-0.5">Today</span>}
                  </p>
                  {dayPools.length === 0 ? (
                    <p className="text-[9px] text-slate-300 text-center">—</p>
                  ) : (
                    <div className="space-y-1">
                      {dayPools.slice(0, 3).map(p => (
                        <Link key={p.id} href={`/pools/${p.id}`}>
                          <div className="text-[9px] leading-tight bg-white rounded-lg px-1.5 py-1 text-slate-700 font-medium truncate hover:bg-pool-50 transition-colors cursor-pointer">
                            {p.name}
                          </div>
                        </Link>
                      ))}
                      {dayPools.length > 3 && (
                        <p className="text-[9px] text-slate-400 text-center">+{dayPools.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
