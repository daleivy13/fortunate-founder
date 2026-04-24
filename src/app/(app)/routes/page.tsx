"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation, CheckCircle2, Clock, Car, Thermometer, Droplets, Wind, Sun, ChevronDown, ChevronUp, ClipboardList, Zap, Loader2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { useGPS } from "@/hooks/useGPS";
import { usePools } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

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
  const { user } = useAuth();
  const { isTracking, totalMiles, startTracking, stopTracking } = useGPS(user?.uid ?? null);
  const { data: poolsData, isLoading } = usePools();

  const [expanded,     setExpanded]    = useState<number | null>(null);
  const [stops,        setStops]       = useState<any[]>([]);
  const [sessionMiles, setSessionMiles] = useState(0);
  const [weather,      setWeather]     = useState<any>(null);

  // Build stops from real pools whenever pool data loads
  useEffect(() => {
    if (poolsData?.pools) {
      const built = poolsData.pools.map(buildStopFromPool);
      if (built.length > 0) (built[0] as any).status = "in_progress";
      setStops(built);
      if (built.length > 0) setExpanded(built[0].id);
    }
  }, [poolsData]);

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
    setStops((prev) => {
      const updated = prev.map((s) => s.id === stopId ? { ...s, status: "complete" } : s);
      // Set next pending stop to current
      const nextIdx = updated.findIndex((s) => s.status === "pending");
      if (nextIdx !== -1) updated[nextIdx] = { ...updated[nextIdx], status: "current" };
      return updated;
    });
    setExpanded(null);
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

                {s !== "complete" && (
                  <button
                    onClick={() => setExpanded(isExp ? null : stop.id)}
                    className="w-full flex items-center justify-center gap-1 mt-3 pt-3 border-t border-slate-100 text-xs text-[#1756a9] font-medium"
                  >
                    {isExp
                      ? <><ChevronUp className="w-3.5 h-3.5" />Hide details</>
                      : <><ChevronDown className="w-3.5 h-3.5" />View details</>}
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
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.pool.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 text-xs py-2 text-center no-underline"
                    >
                      Navigate
                    </a>
                    {stop.pool.clientPhone && (
                      <a href={`tel:${stop.pool.clientPhone}`} className="btn-outline flex-1 text-xs py-2 text-center no-underline">Call</a>
                    )}
                    <Link href={`/reports?pool=${stop.pool.id}`}>
                      <button className="btn-primary text-xs py-2 px-4">+ Report</button>
                    </Link>
                  </div>
                  {s !== "complete" && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => markComplete(stop.id)}
                        className="w-full btn-primary bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Stop Complete
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
