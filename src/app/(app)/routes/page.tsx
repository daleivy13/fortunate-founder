"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation, CheckCircle2, Clock, Car, Thermometer, Droplets, Wind, Sun, ChevronDown, ChevronUp, ClipboardList, Zap, Loader2, ArrowUp, ArrowDown, MessageSquare, FlaskConical, Timer, Wrench } from "lucide-react";
import { useGPS } from "@/hooks/useGPS";
import { usePools } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StopCompletionModal } from "@/components/StopCompletionModal";

const P_STYLES = {
  critical: { border: "border-red-200 bg-red-50",    badge: "bg-red-100 text-red-700"    },
  high:     { border: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  normal:   { border: "border-slate-200 bg-white",    badge: "bg-slate-100 text-slate-600" },
};

function buildStopFromPool(pool: any, idx: number) {
  return {
    id: pool.id,
    pool: {
      id: pool.id,
      name: pool.name,
      address: pool.address,
      volumeGallons: pool.volumeGallons ?? 15000,
      clientName: pool.clientName,
      clientPhone: pool.clientPhone ?? "",
      notes: pool.notes ?? "",
    },
    status: "pending" as const,
    time: `Stop ${idx + 1}`,
    brief: {
      priority: "normal" as const,
      summary: "Standard service",
      actions: ["Chemistry test + standard maintenance", pool.notes ? `📝 ${pool.notes}` : ""].filter(Boolean),
      warnings: [],
    },
    dueTasks: [] as any[],
    lastReading: null,
    weather: null,
  };
}

export default function SmartRoutesPage() {
  const { user, company } = useAuth();
  const { isTracking, totalMiles, startTracking, stopTracking } = useGPS(user?.uid ?? null);
  const { data: poolsData, isLoading } = usePools();

  const { data: equipData } = useQuery({
    queryKey: ["equipment-routes", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?companyId=${company!.id}`);
      return res.json() as Promise<{ equipment: any[] }>;
    },
    enabled: !!company?.id,
  });
  const equipByPool: Record<number, any[]> = {};
  for (const eq of equipData?.equipment ?? []) {
    if (eq.daysLeft !== null && eq.daysLeft <= 30) {
      if (!equipByPool[eq.poolId]) equipByPool[eq.poolId] = [];
      equipByPool[eq.poolId].push(eq);
    }
  }

  const [expanded,     setExpanded]    = useState<number | null>(null);
  const [stops,        setStops]       = useState<any[]>([]);
  const [sessionMiles, setSessionMiles] = useState(0);
  const [weather,      setWeather]     = useState<any>(null);
  const [omwSending,   setOmwSending]  = useState<number | null>(null);
  const [omwSent,      setOmwSent]     = useState<Set<number>>(new Set());

  // Stop time tracking
  const [arrivedAt,    setArrivedAt]   = useState<Record<number, number>>({});
  const [stopDuration, setStopDuration] = useState<Record<number, number>>({});
  const [now,          setNow]          = useState(Date.now());

  // Stop completion modal
  const [activeCompletion, setActiveCompletion] = useState<number | null>(null);

  // Quick chemistry log per stop
  const [chemForms,    setChemForms]   = useState<Record<number, { cl: string; ph: string; ta: string }>>({});
  const [chemLogging,  setChemLogging] = useState<number | null>(null);
  const [chemLogged,   setChemLogged]  = useState<Set<number>>(new Set());

  // Build stops from real pools whenever pool data loads
  useEffect(() => {
    if (poolsData?.pools) {
      const built = poolsData.pools.map(buildStopFromPool);
      if (built.length > 0) (built[0] as any).status = "in_progress";
      setStops(built);
      if (built.length > 0) setExpanded(built[0].id);
    }
  }, [poolsData]);

  const [routeComplete, setRouteComplete] = useState(false);

  // Tick every 30s to update elapsed time on active stop
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch weather intelligence using browser geolocation
  useEffect(() => {
    const fetchWeather = (lat: number, lng: number) => {
      fetch(`/api/weather?lat=${lat}&lng=${lng}`)
        .then((r) => r.json())
        .then((d) => { if (d.weather?.temp) setWeather(d.weather); })
        .catch(() => {});
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {} // user denied or unavailable — skip weather silently
      );
    }
  }, []);

  const done     = stops.filter((s) => s.status === "complete").length;
  const critical = stops.filter((s) => s.brief.priority === "critical" && s.status !== "complete").length;
  const displayMiles = isTracking ? totalMiles : sessionMiles;

  const toggleGPS = async () => {
    if (isTracking) {
      const m = await stopTracking();
      setSessionMiles((p) => Math.round((p + m) * 10) / 10);
    } else {
      await startTracking();
    }
  };

  const markComplete = (stopId: number) => {
    const elapsed = arrivedAt[stopId] ? Math.round((Date.now() - arrivedAt[stopId]) / 60000) : 0;
    if (elapsed > 0) setStopDuration(p => ({ ...p, [stopId]: elapsed }));

    // Capture next stop before state update so we can auto-advance
    const nextStop = stops.find(s => s.id !== stopId && s.status !== "complete");

    setStops((prev) => {
      const updated = prev.map((s) => s.id === stopId ? { ...s, status: "complete" } : s);
      const nextIdx = updated.findIndex((s) => s.status === "pending");
      if (nextIdx !== -1) updated[nextIdx] = { ...updated[nextIdx], status: "current" };
      if (updated.every(s => s.status === "complete")) setRouteComplete(true);
      return updated;
    });

    setExpanded(null);

    // Auto-expand next stop after a short delay
    if (nextStop && !stops.every(s => s.status === "complete" || s.id === stopId)) {
      setTimeout(() => {
        setExpanded(nextStop.id);
        setArrivedAt(p => ({ ...p, [nextStop.id]: Date.now() }));
      }, 1200);
    }
  };

  const logChemistry = async (stop: any) => {
    const form = chemForms[stop.id] ?? { cl: "", ph: "", ta: "" };
    if (!form.cl && !form.ph && !form.ta) return;
    setChemLogging(stop.id);
    try {
      await fetch("/api/chemistry/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId:          stop.pool.id,
          freeChlorine:    form.cl ? parseFloat(form.cl) : undefined,
          ph:              form.ph ? parseFloat(form.ph) : undefined,
          totalAlkalinity: form.ta ? parseFloat(form.ta) : undefined,
        }),
      });
      setChemLogged(p => new Set([...p, stop.id]));
    } catch { /* silent — non-critical */ }
    finally { setChemLogging(null); }
  };

  const sendOmw = async (stop: any) => {
    if (!stop.pool.clientPhone) return;
    setOmwSending(stop.id);
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: stop.pool.clientPhone,
          message: `Hi ${stop.pool.clientName?.split(" ")[0] ?? "there"}, your pool tech is on the way! Expected arrival in ~15 minutes. — PoolPal AI`,
        }),
      });
      setOmwSent(prev => new Set([...prev, stop.id]));
    } catch { /* silent fail */ }
    finally { setOmwSending(null); }
  };

  const completeTask = (stopId: number, taskId: number) => {
    setStops((prev) => prev.map((s) =>
      s.id === stopId ? { ...s, dueTasks: s.dueTasks.filter((t: any) => t.id !== taskId) } : s
    ));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
      </div>
    );
  }

  if (routeComplete && stops.length > 0) {
    const totalTime = Object.values(stopDuration).reduce((s, v) => s + v, 0);
    const chemCount = chemLogged.size;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Route Complete! 🎉</h1>
          <p className="text-slate-500">All {stops.length} stops finished for today.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          {[
            { v: stops.length.toString(), l: "Pools serviced" },
            { v: totalTime > 0 ? `${totalTime} min` : `${displayMiles.toFixed(1)} mi`, l: totalTime > 0 ? "Total time" : "Miles driven" },
            { v: chemCount > 0 ? chemCount.toString() : "—", l: "Chem readings" },
          ].map(s => (
            <div key={s.l} className="card p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{s.v}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <Link href="/reports"><button className="btn-primary w-full">+ Log Service Reports</button></Link>
          <button onClick={() => { setRouteComplete(false); setStops(poolsData?.pools?.map(buildStopFromPool) ?? []); }} className="btn-outline w-full">
            Start New Route
          </button>
        </div>
      </div>
    );
  }

  const activeStop = activeCompletion !== null
    ? stops.find(s => s.id === activeCompletion) ?? null
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {activeStop && (
        <StopCompletionModal
          stop={activeStop}
          onComplete={() => {
            markComplete(activeCompletion!);
            setActiveCompletion(null);
          }}
          onCancel={() => setActiveCompletion(null)}
        />
      )}
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
              { v: stops.length > 0 ? `${done}/${stops.length}` : "—", l: "Stops"    },
              { v: `${displayMiles.toFixed(1)} mi`,                     l: "Miles"    },
              { v: String(critical),                                     l: "Critical", red: critical > 0 },
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
      {weather && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#1756a9]" />
            <h2 className="text-sm font-bold text-slate-900">Today's Weather Intelligence</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { icon: <Thermometer className="w-3.5 h-3.5 text-orange-500" />, label: "Temp",  value: `${weather.temp}°F`,       warn: weather.temp > 90  },
              { icon: <Sun         className="w-3.5 h-3.5 text-yellow-500" />, label: "UV",    value: String(weather.uvIndex),   warn: weather.uvIndex > 7 },
              { icon: <Wind        className="w-3.5 h-3.5 text-slate-400"  />, label: "Wind",  value: `${weather.windSpeed} mph`, warn: false              },
              { icon: <Droplets    className="w-3.5 h-3.5 text-[#00c3e3]"   />, label: "Rain",  value: `${weather.rain1h ?? 0} mm`, warn: false            },
            ].map((s) => (
              <div key={s.label} className={`text-center p-2.5 rounded-xl ${s.warn ? "bg-amber-50" : "bg-slate-50"}`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className={`text-sm font-bold ${s.warn ? "text-amber-700" : "text-slate-900"}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          {weather.doseAdjustment && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">⚠️ Global dose adjustment: {weather.doseAdjustment}</span> — {weather.recommendation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {stops.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{done} of {stops.length} stops complete</span>
            <span className="font-semibold text-[#1756a9]">{Math.round((done / stops.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0891c4] rounded-full transition-all" style={{ width: `${(done / stops.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {stops.length === 0 && (
        <div className="card p-10 text-center text-slate-400">
          <Navigation className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No pools in your route</p>
          <p className="text-sm mt-1">Add pools with service days to build your route</p>
          <Link href="/pools/new"><button className="btn-primary mt-4 text-sm">+ Add Pool</button></Link>
        </div>
      )}

      {/* Stop cards with drag-and-drop reordering */}
      <div className="space-y-3">
        {stops.map((stop, idx) => {
          const s   = stop.status;
          const p   = P_STYLES[stop.brief.priority as keyof typeof P_STYLES] ?? P_STYLES.normal;
          const isExp = expanded === stop.id;

          const moveUp = () => setStops(prev => {
            if (idx === 0) return prev;
            const next = [...prev];
            [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
            return next;
          });
          const moveDown = () => setStops(prev => {
            if (idx === prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
            return next;
          });

          return (
            <div key={stop.id} className={`card border ${p.border} overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Reorder controls */}
                  {stop.status !== "complete" && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                      <button onClick={moveUp} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={moveDown} disabled={idx === stops.length - 1} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex-shrink-0 mt-0.5">
                    {s === "complete"
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : s === "current"
                      ? <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center"><div className="w-2 h-2 bg-[#0891c4] rounded-full animate-pulse" /></div>
                      : <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center"><Clock className="w-2.5 h-2.5 text-slate-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className={`text-sm font-bold ${s === "pending" ? "text-slate-400" : "text-slate-900"}`}>
                          {stop.pool.name}
                          {s === "current" && <span className="ml-2 text-[10px] bg-[#1756a9] text-white px-1.5 py-0.5 rounded-full font-bold">NEXT</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{stop.pool.address}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${p.badge}`}>{stop.brief.priority}</span>
                      </div>
                    </div>
                    {s !== "complete" && <p className="text-xs text-slate-600 font-medium">{stop.brief.summary}</p>}
                  </div>
                </div>

                {s === "complete" && stopDuration[stop.id] && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Timer className="w-3 h-3" />{stopDuration[stop.id]} min at this stop
                  </p>
                )}
                {s !== "complete" && (
                  <button
                    onClick={() => {
                      const opening = !isExp;
                      setExpanded(opening ? stop.id : null);
                      if (opening && !arrivedAt[stop.id]) setArrivedAt(p => ({ ...p, [stop.id]: Date.now() }));
                    }}
                    className="w-full flex items-center justify-center gap-1 mt-3 pt-3 border-t border-slate-100 text-xs text-[#1756a9] font-medium"
                  >
                    {isExp
                      ? <><ChevronUp className="w-3.5 h-3.5" />Hide details</>
                      : <><ChevronDown className="w-3.5 h-3.5" />View details</>}
                  </button>
                )}
                {s !== "complete" && isExp && arrivedAt[stop.id] && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <Timer className="w-3 h-3" />
                    {Math.max(1, Math.round((now - arrivedAt[stop.id]) / 60000))} min at stop
                  </p>
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
                  {/* Quick chemistry log */}
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                      <FlaskConical className="w-3 h-3" />Quick Chemistry Log
                    </p>
                    {chemLogged.has(stop.id) ? (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />Chemistry logged ✓
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        {[
                          { key: "cl", label: "Cl", placeholder: "2.0" },
                          { key: "ph", label: "pH", placeholder: "7.4" },
                          { key: "ta", label: "TA", placeholder: "90"  },
                        ].map(f => (
                          <div key={f.key} className="flex-1">
                            <label className="text-[10px] text-slate-400 font-medium block mb-0.5">{f.label}</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={f.placeholder}
                              className="input py-1.5 text-sm text-center"
                              value={chemForms[stop.id]?.[f.key as "cl"|"ph"|"ta"] ?? ""}
                              onChange={e => setChemForms(p => ({
                                ...p, [stop.id]: { ...(p[stop.id] ?? { cl:"", ph:"", ta:"" }), [f.key]: e.target.value }
                              }))}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => logChemistry(stop)}
                          disabled={chemLogging === stop.id}
                          className="btn-primary text-xs py-2 px-3 mt-3.5"
                        >
                          {chemLogging === stop.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Log"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Equipment alerts */}
                  {(equipByPool[stop.pool.id] ?? []).length > 0 && (
                    <div className="p-4 bg-red-50 border-b border-red-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                        <Wrench className="w-3 h-3" />Equipment alerts
                      </p>
                      {equipByPool[stop.pool.id].map((eq: any) => (
                        <div key={eq.id} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${eq.daysLeft !== null && eq.daysLeft <= 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          <span className="font-medium">{eq.name}</span>
                          <span className="text-[10px] font-bold">
                            {eq.daysLeft !== null && eq.daysLeft <= 0 ? `${Math.abs(eq.daysLeft)}d overdue` : `${eq.daysLeft}d left`}
                          </span>
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
                  <div className="p-4 flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.pool.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 text-xs py-2 text-center no-underline"
                    >
                      Navigate
                    </a>
                    {stop.pool.clientPhone && (
                      <>
                        <a href={`tel:${stop.pool.clientPhone}`} className="btn-outline text-xs py-2 px-3 text-center no-underline">Call</a>
                        <button
                          onClick={() => sendOmw(stop)}
                          disabled={omwSending === stop.id || omwSent.has(stop.id)}
                          className={`text-xs py-2 px-3 rounded-xl font-semibold border transition-all flex items-center gap-1 ${
                            omwSent.has(stop.id)
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {omwSending === stop.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : omwSent.has(stop.id)
                            ? "✓ Sent"
                            : <><MessageSquare className="w-3 h-3" /> On My Way</>}
                        </button>
                      </>
                    )}
                    <Link href={`/reports?pool=${stop.pool.id}`}>
                      <button className="btn-primary text-xs py-2 px-4">+ Report</button>
                    </Link>
                  </div>
                  {s !== "complete" && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => setActiveCompletion(stop.id)}
                        className="w-full btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 font-bold"
                        style={{ minHeight: 52 }}
                      >
                        <CheckCircle2 className="w-5 h-5" /> Complete Stop &amp; Log Report
                      </button>
                    </div>
                  )}
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
          <div className="flex-1 text-center bg-slate-50 rounded-xl py-3">
            <p className="text-lg font-bold">{displayMiles.toFixed(1)} mi</p>
            <p className="text-xs text-slate-400">Today</p>
          </div>
          <div className="flex-1 text-center bg-emerald-50 rounded-xl py-3">
            <p className="text-lg font-bold text-emerald-600">${(displayMiles * 0.67).toFixed(2)}</p>
            <p className="text-xs text-slate-400">Tax deduction</p>
          </div>
          <div className="flex-1 text-center bg-[#e8f1fc] rounded-xl py-3">
            <p className="text-lg font-bold text-[#1756a9]">{stops.length} stops</p>
            <p className="text-xs text-slate-400">Today's route</p>
          </div>
        </div>
      </div>
    </div>
  );
}
