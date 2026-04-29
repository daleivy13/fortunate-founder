"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePools } from "@/hooks/useData";
import { Shield, AlertTriangle, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { calculatePoolCompliance } from "@/lib/compliance/calculator";
import Link from "next/link";

type ComplianceFilter = "all" | "warning" | "suspended" | "optimal";

const STATUS_BADGE: Record<string, { cls: string; label: string; icon: any }> = {
  compliant: { cls: "badge-green",  label: "Compliant",  icon: CheckCircle2  },
  warning:   { cls: "badge-amber",  label: "Warning",    icon: AlertTriangle  },
  suspended: { cls: "badge-red",    label: "Suspended",  icon: Shield         },
};

const PARAM_LABELS: Record<string, string> = {
  freeChlorine: "Free Cl",
  ph:           "pH",
  alkalinity:   "Alkalinity",
};

export default function CompliancePage() {
  const { company } = useAuth();
  const { data: poolsData, isLoading: poolsLoading } = usePools();
  const [filter, setFilter] = useState<ComplianceFilter>("all");

  const pools: any[] = poolsData?.pools ?? [];

  // Fetch compliance for all pools in one batch
  const { data: complianceMap, isLoading: compLoading } = useQuery({
    queryKey: ["compliance-all", company?.id],
    queryFn: async () => {
      const results: Record<number, any> = {};
      await Promise.all(pools.map(async p => {
        try {
          const res = await fetch(`/api/compliance/${p.id}`);
          results[p.id] = await res.json();
        } catch {}
      }));
      return results;
    },
    enabled: pools.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = poolsLoading || compLoading;

  const poolsWithCompliance = pools.map(p => ({
    ...p,
    compliance: complianceMap?.[p.id] ?? { status: "compliant", consecutiveWarningDays: 0 },
  }));

  const filtered = poolsWithCompliance.filter(p => {
    if (filter === "all")      return true;
    if (filter === "warning")  return p.compliance?.status === "warning";
    if (filter === "suspended")return p.compliance?.status === "suspended";
    if (filter === "optimal")  return (p.compliance?.consecutiveOptimalDays ?? 0) >= 14;
    return true;
  }).sort((a, b) => {
    const rank = { suspended: 0, warning: 1, compliant: 2 };
    return (rank[a.compliance?.status as keyof typeof rank] ?? 2) - (rank[b.compliance?.status as keyof typeof rank] ?? 2);
  });

  const warningCount  = poolsWithCompliance.filter(p => p.compliance?.status === "warning").length;
  const suspendedCount = poolsWithCompliance.filter(p => p.compliance?.status === "suspended").length;
  const optimalCount  = poolsWithCompliance.filter(p => (p.compliance?.consecutiveOptimalDays ?? 0) >= 14).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">PoolPal Protocol</h1>
        <p className="text-slate-500 text-sm mt-1">Compliance tracking across all pools — powers insurance coverage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Pools</p>
          <p className="stat-value">{pools.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Warning</p>
          <p className="stat-value text-amber-600">{warningCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Suspended</p>
          <p className="stat-value text-red-600">{suspendedCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Optimal Streak (14d+)</p>
          <p className="stat-value text-emerald-600">{optimalCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: "all",       label: "All Pools" },
          { key: "warning",   label: `Warning (${warningCount})` },
          { key: "suspended", label: `Suspended (${suspendedCount})` },
          { key: "optimal",   label: `Optimal Streaks (${optimalCount})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pool compliance list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-pool-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No pools match this filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(pool => {
            const c  = pool.compliance ?? {};
            const cfg = STATUS_BADGE[c.status ?? "compliant"] ?? STATUS_BADGE.compliant;
            const Icon = cfg.icon;

            return (
              <Link key={pool.id} href={`/pools/${pool.id}`}>
                <div className={`card p-4 hover:shadow-md transition-shadow border ${c.status === "warning" ? "border-amber-200" : c.status === "suspended" ? "border-red-200" : "border-slate-200"}`}>
                  <div className="flex items-center gap-4">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${c.status === "warning" ? "text-amber-500" : c.status === "suspended" ? "text-red-500" : "text-emerald-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-900 truncate">{pool.name}</p>
                        <span className={cfg.cls}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{pool.clientName} · {pool.address}</p>
                      {c.status === "warning" && (
                        <p className="text-xs text-amber-700 mt-1">
                          Day {c.consecutiveWarningDays} of 14
                          {c.worstParameter ? ` · ${PARAM_LABELS[c.worstParameter] ?? c.worstParameter} out of range` : ""}
                        </p>
                      )}
                      {c.consecutiveOptimalDays >= 14 && c.status === "compliant" && (
                        <p className="text-xs text-emerald-600 mt-1">🎯 {c.consecutiveOptimalDays}-day optimal streak</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.status === "warning" && (
                        <Link href="/chemistry" onClick={e => e.stopPropagation()}>
                          <button className="btn-primary text-xs py-1.5 px-3">Fix Now</button>
                        </Link>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
