"use client";

import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle2, Clock, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { getPenaltyForDay, getNextReward, REWARD_MILESTONES } from "@/lib/compliance/penalties";

interface Props { poolId: number }

const STATUS_CONFIG = {
  compliant: {
    icon:   CheckCircle2,
    color:  "text-emerald-600",
    bg:     "bg-emerald-50",
    border: "border-emerald-200",
    label:  "Compliant",
    sub:    "Full coverage active",
  },
  warning: {
    icon:   AlertTriangle,
    color:  "text-amber-600",
    bg:     "bg-amber-50",
    border: "border-amber-200",
    label:  "Warning",
    sub:    "Coverage at risk",
  },
  suspended: {
    icon:   Shield,
    color:  "text-red-600",
    bg:     "bg-red-50",
    border: "border-red-200",
    label:  "Suspended",
    sub:    "Coverage suspended",
  },
};

const PARAM_LABELS: Record<string, string> = {
  freeChlorine: "Free Chlorine",
  ph:           "pH",
  alkalinity:   "Total Alkalinity",
};

export function ComplianceWidget({ poolId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/compliance/${poolId}`);
      return res.json();
    },
    enabled: !!poolId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="card p-5 flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-pool-500" />
      <span className="text-sm text-slate-400">Checking compliance…</span>
    </div>
  );

  if (!data || data.error) return null;

  const cfg    = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.compliant;
  const Icon   = cfg.icon;
  const penalty = data.currentPenalty;
  const nextReward = data.nextReward;
  const reading = data.lastReading ?? {};

  const IDEAL: Record<string, { min: number; max: number; unit: string }> = {
    freeChlorine: { min: 3.0, max: 5.0, unit: "ppm" },
    ph:           { min: 7.4, max: 7.6, unit: ""    },
    alkalinity:   { min: 80,  max: 120, unit: "ppm" },
  };

  return (
    <div className={`card border ${cfg.border} overflow-hidden`}>
      {/* Status bar */}
      <div className={`${cfg.bg} p-4 flex items-center gap-3`}>
        <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
        <div className="flex-1">
          <p className={`font-bold ${cfg.color}`}>{cfg.label} — {cfg.sub}</p>
          {data.status === "warning" && penalty && (
            <p className="text-xs text-amber-700 mt-0.5">
              Day {data.consecutiveWarningDays} of 14 · {penalty.description}
            </p>
          )}
          {data.status === "suspended" && (
            <p className="text-xs text-red-700 mt-0.5">Coverage suspended after 14+ days out of compliance</p>
          )}
        </div>
        <Link href={`/compliance`}>
          <ChevronRight className={`w-4 h-4 ${cfg.color}`} />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* Last readings vs targets */}
        {Object.keys(IDEAL).some(k => reading[k] !== undefined) && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Current Readings</p>
            <div className="space-y-1.5">
              {Object.entries(IDEAL).map(([key, ideal]) => {
                const val = reading[key];
                if (val === undefined) return null;
                const inRange = val >= ideal.min && val <= ideal.max;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{PARAM_LABELS[key]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">target {ideal.min}–{ideal.max}{ideal.unit}</span>
                      <span className={`font-bold ${inRange ? "text-emerald-600" : "text-red-600"}`}>
                        {val}{ideal.unit} {inRange ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Penalty timeline if in warning */}
        {data.status === "warning" && data.consecutiveWarningDays >= 1 && (
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-2">Penalty Timeline</p>
            <div className="space-y-1">
              {[
                { days: "1–3",   level: "Notification only"    },
                { days: "4–7",   level: "Coverage tier reduced" },
                { days: "8–10",  level: "Deductibles doubled"   },
                { days: "11–13", level: "Equipment exclusions"  },
                { days: "14+",   level: "Coverage suspended"    },
              ].map(row => {
                const d = data.consecutiveWarningDays;
                const active =
                  (row.days === "1–3"   && d <= 3)  ||
                  (row.days === "4–7"   && d >= 4  && d <= 7)  ||
                  (row.days === "8–10"  && d >= 8  && d <= 10) ||
                  (row.days === "11–13" && d >= 11 && d <= 13) ||
                  (row.days === "14+"   && d >= 14);
                return (
                  <div key={row.days} className={`flex items-center gap-2 text-xs ${active ? "font-bold text-amber-800" : "text-amber-600 opacity-60"}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-amber-500" : "bg-amber-200"}`} />
                    Day {row.days}: {row.level}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reward progress */}
        {data.status === "compliant" && nextReward && (
          <div className="bg-[#e8f1fc] rounded-xl p-3">
            <p className="text-xs font-bold text-[#1756a9] mb-1">🎁 Streak Reward Progress</p>
            <p className="text-sm text-[#1756a9]">
              {nextReward.daysLeft}d until <span className="font-bold">{nextReward.reward}</span>
            </p>
            <div className="h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#1756a9] rounded-full"
                style={{ width: `${Math.min((data.consecutiveOptimalDays / nextReward.days) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {(data.status === "warning" || data.status === "suspended") && (
            <Link href="/chemistry">
              <button className="btn-primary text-xs py-2">⚗️ Check Chemistry</button>
            </Link>
          )}
          <Link href={`/compliance`}>
            <button className="btn-outline text-xs py-2">View Full Status</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
