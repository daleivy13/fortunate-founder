"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, TrendingUp, Award, AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { getEffectiveLevel, getLevelLabel, getLevelColor, getDaysToNextLevel } from "@/lib/tech-experience";
import { getCategoryInfo } from "@/lib/equipment-categories";
import Link from "next/link";

const AVATAR_COLORS = [
  "from-pool-500 to-[#00c3e3]",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function parseJson<T>(val: any, fallback: T): T {
  if (Array.isArray(val)) return val as unknown as T;
  try { return JSON.parse(val ?? "null") ?? fallback; } catch { return fallback; }
}

export default function EmployeeDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const { company } = useAuth();
  const qc         = useQueryClient();

  const [promoting, setPromoting] = useState(false);
  const [demoting,  setDemoting]  = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error("Employee not found");
      return res.json() as Promise<{ employee: any; events: any[] }>;
    },
    enabled: !!id,
  });

  const promote = useMutation({
    mutationFn: async (level: string) => {
      const res = await fetch(`/api/employees/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ experienceLevel: level }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-detail", id] }),
  });

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
    </div>
  );

  const emp: any = data?.employee;
  const events: any[] = data?.events ?? [];

  if (!emp) return (
    <div className="text-center py-20">
      <p className="text-slate-400">Employee not found</p>
      <Link href="/employees"><button className="btn-primary mt-4">← Back to Employees</button></Link>
    </div>
  );

  const level      = getEffectiveLevel({ id: emp.id, experienceLevel: emp.experience_level, startedDate: emp.started_date, servicesCompleted: emp.services_completed, equipmentTrainedOn: emp.equipment_trained_on });
  const { label: progressLabel, pct } = getDaysToNextLevel({ id: emp.id, experienceLevel: emp.experience_level, startedDate: emp.started_date, servicesCompleted: emp.services_completed });
  const trained    = parseJson<string[]>(emp.equipment_trained_on, []);
  const scenarios  = parseJson<string[]>(emp.scenarios_completed, []);
  const daysAt     = emp.started_date ? Math.floor((Date.now() - new Date(emp.started_date).getTime()) / 86400000) : null;

  const canPromoteToExp = level === "developing" && (emp.services_completed ?? 0) >= 100;
  const canPromoteToLead = level === "experienced";

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Back */}
      <Link href="/employees">
        <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Employees
        </button>
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[emp.id % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
            {initials(emp.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{emp.name}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getLevelColor(level)}`}>{getLevelLabel(level)}</span>
            </div>
            <p className="text-sm text-slate-500 capitalize mb-3">{(emp.role ?? "technician").replace(/_/g, " ")}</p>

            {/* Progress */}
            {pct < 100 && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{progressLabel}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1756a9] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Services",       value: emp.services_completed ?? 0 },
          { label: "Days at Company",value: daysAt !== null ? `${daysAt}d` : "—" },
          { label: "Equipment Types",value: trained.length },
          { label: "Scenarios",      value: scenarios.length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Equipment trained on */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-pool-500" /> Equipment Trained On
        </h2>
        {trained.length === 0 ? (
          <p className="text-slate-400 text-sm">No equipment training recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trained.map((eq: string) => {
              const cat = getCategoryInfo(eq);
              return (
                <span key={eq} className="flex items-center gap-1.5 bg-[#e8f1fc] text-[#1756a9] px-3 py-1.5 rounded-full text-sm font-medium">
                  {cat.icon} {cat.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Scenarios completed */}
      {scenarios.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Scenarios Completed
          </h2>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s: string) => (
              <span key={s} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium capitalize">
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Promotion controls */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Level Management
        </h2>
        <div className="flex flex-wrap gap-2">
          {canPromoteToExp && (
            <button
              onClick={() => promote.mutate("experienced")}
              disabled={promote.isPending}
              className="btn-primary text-sm"
            >
              {promote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Promote to Experienced ↑"}
            </button>
          )}
          {canPromoteToLead && (
            <button
              onClick={() => promote.mutate("lead")}
              disabled={promote.isPending}
              className="btn-primary text-sm"
            >
              {promote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Promote to Lead Tech ↑"}
            </button>
          )}
          {level !== "new" && (
            <>
              {!confirmDemote ? (
                <button onClick={() => setConfirmDemote(true)} className="btn-danger text-sm">Demote ↓</button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Are you sure?</span>
                  <button
                    onClick={() => { promote.mutate("developing"); setConfirmDemote(false); }}
                    className="btn-danger text-sm"
                  >
                    Yes, demote
                  </button>
                  <button onClick={() => setConfirmDemote(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              )}
            </>
          )}
          {level === "new" && !canPromoteToExp && (
            <p className="text-sm text-slate-400">Auto-promotes when thresholds are reached.</p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {events.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {events.slice(0, 20).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-400 text-xs w-28 flex-shrink-0">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
                <span className="capitalize text-slate-700">{ev.event_type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
