"use client";

import { useState } from "react";
import { Navigation, CheckCircle2, Clock, Car, Thermometer, Droplets, Wind, Sun, ChevronDown, ChevronUp, ClipboardList, Zap } from "lucide-react";
import { useGPS } from "@/hooks/useGPS";
import Link from "next/link";

const MOCK_STOPS = [
  {
    id: 1,
    pool: { id: 1, name: "Rivera Family", address: "2250 Sunset Ln, Mesa, AZ", volumeGallons: 12000, clientName: "Carlos Rivera", clientPhone: "(480) 555-0303", notes: "Gate code: 1847. Dog in yard — friendly." },
    status: "complete", time: "8:45 AM",
    brief: { priority: "normal", summary: "Completed — all good", actions: [], warnings: [] },
    weather: { temp: 97, uvIndex: 9, windSpeed: 8, rain1h: 0 },
    dueTasks: [],
    lastReading: { freeChlorine: 3.1, ph: 7.5 },
  },
  {
    id: 2,
    pool: { id: 2, name: "Johnson Residence", address: "1420 Maple Dr, Scottsdale, AZ", volumeGallons: 15000, clientName: "Mike Johnson", clientPhone: "(480) 555-0101", notes: "Leave gate latched. Paid monthly." },
    status: "current", time: "ETA 10:20 AM",
    brief: {
      priority: "critical", summary: "Critical — 5 items need attention",
      actions: [
        "🔴 SHOCK: Cl critically low (0.8 ppm) — shock treatment required",
        "🟡 pH HIGH (8.4): Add muriatic acid — 18 fl oz per 15,000 gal",
        "🔴 OVERDUE: Clean/backwash filter (12 days overdue)",
        "🟡 DUE: Apply monthly algaecide",
        "📝 Leave gate latched. Paid monthly.",
      ],
      warnings: [
        "🌡️ Today is 97°F — increase all chemical doses by +40%",
        "☀️ UV index 9 — verify CYA ≥ 50 ppm or chlorine will be gone by afternoon",
      ],
    },
    weather: { temp: 97, uvIndex: 9, windSpeed: 8, rain1h: 0 },
    dueTasks: [
      { id: 1, name: "Clean/backwash filter", status: "overdue", icon: "🔧", daysUntilDue: -12 },
      { id: 2, name: "Apply monthly algaecide", status: "due", icon: "🧪", daysUntilDue: 0 },
    ],
    lastReading: { freeChlorine: 0.8, ph: 8.4 },
  },
  {
    id: 3,
    pool: { id: 3, name: "Park Estates HOA", address: "800 Park Blvd, Tempe, AZ", volumeGallons: 50000, clientName: "Sarah Chen", clientPhone: "(480) 555-0202", notes: "Report to front office on arrival. Commercial grade chemicals only." },
    status: "pending", time: "~12:30 PM",
    brief: {
      priority: "high", summary: "2 items need attention",
      actions: [
        "🟡 Cl at 1.2 ppm — bring to 3 ppm (add 40 fl oz liquid chlorine, +40% for heat)",
        "🟡 DUE: Full 6-point chemistry test today",
        "📝 Report to front office on arrival. Commercial grade only.",
      ],
      warnings: ["🌡️ Dose adjustment: +40% for 97°F heat"],
    },
    weather: { temp: 97, uvIndex: 9, windSpeed: 12, rain1h: 0 },
    dueTasks: [{ id: 3, name: "Full 6-point chemistry test", status: "due", icon: "⚗️", daysUntilDue: 0 }],
    lastReading: { freeChlorine: 1.2, ph: 7.4 },
  },
  {
    id: 4,
    pool: { id: 4, name: "Desert Oasis Resort", address: "5500 Resort Way, Gilbert, AZ", volumeGallons: 80000, clientName: "GM — Front Office", clientPhone: "(480) 555-0404", notes: "Use staff entrance. Log all chemicals with front desk. Bather load 200+ on weekends." },
    status: "pending", time: "~2:15 PM",
    brief: {
      priority: "high", summary: "High bather load — extra attention needed",
      actions: [
        "📊 Full chemistry test required — last test was 5 days ago",
        "🟡 Weekend bather load 200+ — expect high chlorine demand",
        "🟡 DUE: Check & adjust water level",
        "📝 Use staff entrance. Log chemicals with front desk.",
      ],
      warnings: ["🌡️ Dose adjustment: +40% for 97°F + high bather load = double demand"],
    },
    weather: { temp: 97, uvIndex: 8, windSpeed: 10, rain1h: 0 },
    dueTasks: [{ id: 4, name: "Check & adjust water level", status: "due", icon: "📏", daysUntilDue: 0 }],
    lastReading: null,
  },
  {
    id: 5,
    pool: { id: 5, name: "Thompson Backyard", address: "310 Oak Ave, Chandler, AZ", volumeGallons: 8000, clientName: "Beth Thompson", clientPhone: "(480) 555-0505", notes: "Key under mat on left. New puppy — check gate before entering." },
    status: "pending", time: "~4:00 PM",
    brief: {
      priority: "normal", summary: "Standard service",
      actions: ["📊 Chemistry test + standard maintenance", "📝 Key under mat. New puppy — check gate."],
      warnings: [],
    },
    weather: { temp: 95, uvIndex: 7, windSpeed: 6, rain1h: 0 },
    dueTasks: [],
    lastReading: { freeChlorine: 2.5, ph: 7.4 },
  },
];

const P_STYLES = {
  critical: { border: "border-red-200 bg-red-50",    badge: "bg-red-100 text-red-700"    },
  high:     { border: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  normal:   { border: "border-slate-200 bg-white",    badge: "bg-slate-100 text-slate-600" },
};

export default function SmartRoutesPage() {
  const { isTracking, totalMiles, startTracking, stopTracking } = useGPS();
  const [expanded,      setExpanded]     = useState<number | null>(2);
  const [stops,         setStops]        = useState(MOCK_STOPS);
  const [sessionMiles,  setSessionMiles] = useState(0);

  const done         = stops.filter((s) => s.status === "complete").length;
  const critical     = stops.filter((s) => s.brief.priority === "critical" && s.status !== "complete").length;
  const displayMiles = isTracking ? totalMiles : sessionMiles;

  const toggleGPS = async () => {
    if (isTracking) { const m = await stopTracking(); setSessionMiles((p) => Math.round((p + m) * 10) / 10); }
    else await startTracking();
  };

  const completeTask = (stopId: number, taskId: number) => {
    setStops((prev) => prev.map((s) => s.id === stopId ? { ...s, dueTasks: s.dueTasks.filter((t: any) => t.id !== taskId) } : s));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Routes</h1>
          <p className="text-slate-500 text-sm mt-1">Weather-aware briefings · AI dosage adjustments · Task reminders</p>
        </div>
        <button onClick={toggleGPS} className={isTracking ? "btn-danger" : "btn-primary"}>
          <Navigation className="w-4 h-4" />
          {isTracking ? "Stop GPS" : "Start GPS"}
        </button>
      </div>

      {/* Status bar */}
      <div className={`card p-4 ${isTracking ? "border-emerald-300 bg-emerald-50" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-sm font-semibold">{isTracking ? "Tracking Active" : "GPS Paused"}</span>
          </div>
          <div className="flex gap-5 text-center">
            {[
              { v: `${done}/${stops.length}`, l: "Stops"    },
              { v: `${displayMiles.toFixed(1)} mi`, l: "Miles"    },
              { v: String(critical), l: "Critical", red: critical > 0 },
            ].map((s) => (
              <div key={s.l}>
                <p className={`text-base font-bold ${(s as any).red ? "text-red-600" : "text-slate-900"}`}>{s.v}</p>
                <p className="text-[10px] text-slate-400 uppercase">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weather intelligence banner */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#1756a9]" />
          <h2 className="text-sm font-bold text-slate-900">Today's Weather Intelligence</h2>
          <span className="text-xs text-slate-400 ml-auto">Scottsdale, AZ</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: <Thermometer className="w-3.5 h-3.5 text-orange-500" />, label: "Temp",   value: "97°F",  warn: true  },
            { icon: <Sun         className="w-3.5 h-3.5 text-yellow-500" />, label: "UV",     value: "9",     warn: true  },
            { icon: <Wind        className="w-3.5 h-3.5 text-slate-400"  />, label: "Wind",   value: "8 mph", warn: false },
            { icon: <Droplets    className="w-3.5 h-3.5 text-[#00c3e3]"   />, label: "Rain",   value: "0 mm",  warn: false },
          ].map((s) => (
            <div key={s.label} className={`text-center p-2.5 rounded-xl ${s.warn ? "bg-amber-50" : "bg-slate-50"}`}>
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className={`text-sm font-bold ${s.warn ? "text-amber-700" : "text-slate-900"}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">⚠️ Global dose adjustment today: +40%</span> — Extreme heat (97°F) + UV index 9 burns chlorine rapidly. Apply to all pools. Verify CYA ≥ 50 ppm at each stop.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{done} of {stops.length} stops complete</span>
          <span className="font-semibold text-[#1756a9]">{Math.round((done / stops.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0891c4] rounded-full transition-all" style={{ width: `${(done / stops.length) * 100}%` }} />
        </div>
      </div>

      {/* Stop cards */}
      <div className="space-y-3">
        {stops.map((stop, idx) => {
          const s  = stop.status;
          const p  = P_STYLES[stop.brief.priority as keyof typeof P_STYLES] ?? P_STYLES.normal;
          const isExp = expanded === stop.id;

          return (
            <div key={stop.id} className={`card border ${p.border} overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {s === "complete" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : s === "current" ? <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center"><div className="w-2 h-2 bg-[#0891c4] rounded-full animate-pulse" /></div>
                      : <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center"><Clock className="w-2.5 h-2.5 text-slate-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className={`text-sm font-bold ${s === "pending" ? "text-slate-400" : "text-slate-900"}`}>
                          {stop.pool.name}
                          {s === "current" && <span className="ml-2 text-[10px] bg-[#1756a9] text-white px-1.5 py-0.5 rounded-full font-bold">EN ROUTE</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{stop.pool.address}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${p.badge}`}>{stop.brief.priority}</span>
                        <span className="text-xs text-slate-400">{stop.time}</span>
                      </div>
                    </div>
                    {s !== "complete" && <p className="text-xs text-slate-600 font-medium">{stop.brief.summary}</p>}
                    {stop.dueTasks.length > 0 && s !== "complete" && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {stop.dueTasks.map((t: any) => (
                          <span key={t.id} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {t.icon} {t.name.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {s !== "complete" && (
                  <button onClick={() => setExpanded(isExp ? null : stop.id)} className="w-full flex items-center justify-center gap-1 mt-3 pt-3 border-t border-slate-100 text-xs text-[#1756a9] font-medium">
                    {isExp ? <><ChevronUp className="w-3.5 h-3.5" />Hide briefing</> : <><ChevronDown className="w-3.5 h-3.5" />Full briefing ({stop.brief.actions.length} items)</>}
                  </button>
                )}
              </div>

              {isExp && s !== "complete" && (
                <div className="border-t border-slate-100">
                  {stop.brief.warnings.length > 0 && (
                    <div className="p-4 bg-amber-50 border-b border-amber-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">⚠️ Weather alerts</p>
                      {stop.brief.warnings.map((w: string, i: number) => <p key={i} className="text-xs text-amber-800">{w}</p>)}
                    </div>
                  )}
                  {stop.brief.actions.length > 0 && (
                    <div className="p-4 border-b border-slate-100 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Actions for this stop</p>
                      {stop.brief.actions.map((a: string, i: number) => <p key={i} className="text-xs text-slate-700 leading-relaxed">{a}</p>)}
                    </div>
                  )}
                  {stop.dueTasks.length > 0 && (
                    <div className="p-4 border-b border-slate-100 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><ClipboardList className="w-3 h-3" />Scheduled tasks</p>
                      {stop.dueTasks.map((task: any) => (
                        <div key={task.id} className={`flex items-center justify-between p-2.5 rounded-xl ${task.status === "overdue" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                          <div className="flex items-center gap-2">
                            <span>{task.icon}</span>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{task.name}</p>
                              <p className="text-[10px] text-slate-400">{task.status === "overdue" ? `${Math.abs(task.daysUntilDue)} days overdue` : "Due today"}</p>
                            </div>
                          </div>
                          <button onClick={() => completeTask(stop.id, task.id)} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600">
                            Done ✓
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {stop.pool.notes && (
                    <div className="p-4 bg-[#e8f1fc] border-b border-blue-100 flex gap-2">
                      <span className="flex-shrink-0">📝</span>
                      <p className="text-xs text-blue-900">{stop.pool.notes}</p>
                    </div>
                  )}
                  <div className="p-4 flex gap-2">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.pool.address)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-xs py-2 text-center no-underline">Navigate</a>
                    <a href={`tel:${stop.pool.clientPhone}`} className="btn-outline flex-1 text-xs py-2 text-center no-underline">Call</a>
                    <Link href={`/reports?pool=${stop.pool.id}`}><button className="btn-primary text-xs py-2 px-4">+ Report</button></Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mileage */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3"><Car className="w-4 h-4 text-[#1756a9]" /><h2 className="font-bold text-slate-900 text-sm">Mileage Log</h2></div>
        <div className="flex gap-3">
          <div className="flex-1 text-center bg-slate-50 rounded-xl py-3"><p className="text-lg font-bold">{displayMiles.toFixed(1)} mi</p><p className="text-xs text-slate-400">Today</p></div>
          <div className="flex-1 text-center bg-emerald-50 rounded-xl py-3"><p className="text-lg font-bold text-emerald-600">${(displayMiles * 0.67).toFixed(2)}</p><p className="text-xs text-slate-400">Tax deduction</p></div>
          <div className="flex-1 text-center bg-[#e8f1fc] rounded-xl py-3"><p className="text-lg font-bold text-[#1756a9]">487 mi</p><p className="text-xs text-slate-400">This month</p></div>
        </div>
      </div>
    </div>
  );
}
