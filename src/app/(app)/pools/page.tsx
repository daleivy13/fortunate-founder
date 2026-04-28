"use client";

import { useState } from "react";
import { Search, Plus, Waves, Phone, Mail, Loader2, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePools } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const SERVICE_DAYS = ["all", "mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const TODAY_DAY = ["sun","mon","tue","wed","thu","fri","sat"][new Date().getDay()];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  F: "bg-red-100 text-red-700",
};

export default function PoolsPage() {
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<"all" | "residential" | "commercial" | "hoa">("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [sortBy,    setSortBy]    = useState<"name" | "service_day" | "monthly_rate" | "profitability" | "health">("name");
  const { data, isLoading, isError } = usePools();
  const { company } = useAuth();

  const { data: profData } = useQuery({
    queryKey: ["pool-profitability", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pools/profitability?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  const { data: healthData } = useQuery({
    queryKey: ["client-health", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/health?companyId=${company!.id}`);
      return res.json();
    },
    enabled: !!company?.id,
  });

  const profMap: Record<number, string>   = {};
  const healthMap: Record<number, string> = {};
  for (const p of profData?.pools ?? [])   profMap[p.poolId]   = p.grade;
  for (const h of healthData?.clients ?? []) healthMap[h.poolId] = h.grade;

  const allPools = (data?.pools ?? []) as any[];

  const pools = allPools
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q);
      const matchFilter = filter === "all" || p.type === filter;
      const matchDay    = dayFilter === "all" || p.serviceDay === dayFilter;
      return matchSearch && matchFilter && matchDay;
    })
    .sort((a, b) => {
      if (sortBy === "monthly_rate") return (b.monthlyRate ?? 0) - (a.monthlyRate ?? 0);
      if (sortBy === "service_day") {
        const dayOrder = ["mon","tue","wed","thu","fri","sat","sun"];
        return (dayOrder.indexOf(a.serviceDay ?? "") ?? 7) - (dayOrder.indexOf(b.serviceDay ?? "") ?? 7);
      }
      if (sortBy === "profitability") {
        const gradeOrder = { A: 0, B: 1, C: 2, D: 3, F: 4 };
        return (gradeOrder[profMap[a.id] as keyof typeof gradeOrder] ?? 5) - (gradeOrder[profMap[b.id] as keyof typeof gradeOrder] ?? 5);
      }
      if (sortBy === "health") {
        const gradeOrder = { A: 0, B: 1, C: 2, D: 3, F: 4 };
        return (gradeOrder[healthMap[a.id] as keyof typeof gradeOrder] ?? 5) - (gradeOrder[healthMap[b.id] as keyof typeof gradeOrder] ?? 5);
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pools</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading..." : `${allPools.length} active pools`}
          </p>
        </div>
        <Link href="/pools/new">
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> Add Pool
          </button>
        </Link>
      </div>

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search pools, clients, addresses..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="name">Sort: Name</option>
            <option value="service_day">Sort: Service Day</option>
            <option value="monthly_rate">Sort: Rate (high→low)</option>
            <option value="profitability">Sort: Profitability</option>
            <option value="health">Sort: Client Health</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "residential", "commercial", "hoa"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f ? "bg-pool-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All Types" : f}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {SERVICE_DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition-all ${
                dayFilter === d
                  ? "bg-amber-500 text-white"
                  : d === TODAY_DAY
                  ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d === "all" ? <><CalendarDays className="w-3.5 h-3.5 inline mr-1" />All Days</> : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
        </div>
      )}

      {isError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Could not load pools. Check your database connection and try refreshing.
        </div>
      )}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pools.map((pool) => (
          <Link key={pool.id} href={`/pools/${pool.id}`}>
            <div className="card-hover p-5 h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{pool.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{pool.clientName}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {profMap[pool.id] && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${GRADE_COLORS[profMap[pool.id]]}`} title="Profitability">
                      P:{profMap[pool.id]}
                    </span>
                  )}
                  {healthMap[pool.id] && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${GRADE_COLORS[healthMap[pool.id]]}`} title="Client Health">
                      H:{healthMap[pool.id]}
                    </span>
                  )}
                  <span className="badge badge-slate capitalize">{pool.type}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Waves className="w-3 h-3" />
                  {pool.volumeGallons ? `${pool.volumeGallons.toLocaleString()} gal` : "—"} · {pool.serviceDay ?? "—"}
                </p>
                <p className="text-xs text-slate-500 truncate">📍 {pool.address}</p>
                <div className="flex gap-3 mt-2">
                  {pool.clientPhone && (
                    <span className="flex items-center gap-1 text-xs text-pool-600">
                      <Phone className="w-3 h-3" />{pool.clientPhone}
                    </span>
                  )}
                  {pool.clientEmail && (
                    <span className="flex items-center gap-1 text-xs text-pool-600">
                      <Mail className="w-3 h-3" />Email
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {pool.monthlyRate ? `$${pool.monthlyRate}/mo` : "—"}
                </span>
                <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                  <Link href={`/chemistry?pool=${pool.id}`}>
                    <button className="text-xs btn-secondary py-1 px-2.5">⚗️ Chemistry</button>
                  </Link>
                  <Link href={`/reports?pool=${pool.id}`}>
                    <button className="text-xs btn-primary py-1 px-2.5">+ Report</button>
                  </Link>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pools.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>{pools.length} pool{pools.length !== 1 ? "s" : ""} shown</span>
          {pools.some(p => p.monthlyRate) && (
            <span className="font-semibold text-emerald-600">
              ${pools.reduce((s: number, p: any) => s + (p.monthlyRate ?? 0), 0).toLocaleString()}/mo total rate
            </span>
          )}
        </div>
      )}

      {pools.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <Waves className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No pools found</p>
          <p className="text-sm mt-1">Try adjusting your search or add a new pool</p>
          <Link href="/pools/new">
            <button className="btn-primary mt-4">+ Add First Pool</button>
          </Link>
        </div>
      )}
    </div>
  );
}
