"use client";

import { useState } from "react";
import { Search, Plus, Waves, Phone, Mail, MoreVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePools } from "@/hooks/useData";

const MOCK_POOLS = [
  { id: 1, name: "Johnson Residence", clientName: "Mike Johnson", address: "1420 Maple Dr, Scottsdale, AZ", clientPhone: "(480) 555-0101", clientEmail: "mjohnson@email.com", type: "residential", volumeGallons: 15000, monthlyRate: 150, serviceDay: "Mon/Thu" },
  { id: 2, name: "Park Estates HOA", clientName: "Sarah Chen (HOA Mgr)", address: "800 Park Blvd, Tempe, AZ", clientPhone: "(480) 555-0202", clientEmail: "hoa@parkestates.com", type: "hoa", volumeGallons: 50000, monthlyRate: 400, serviceDay: "Tue/Fri" },
  { id: 3, name: "Rivera Family", clientName: "Carlos Rivera", address: "2250 Sunset Ln, Mesa, AZ", clientPhone: "(480) 555-0303", clientEmail: "crivera@email.com", type: "residential", volumeGallons: 12000, monthlyRate: 120, serviceDay: "Wednesday" },
  { id: 4, name: "Desert Oasis Resort", clientName: "GM — Front Office", address: "5500 Resort Way, Gilbert, AZ", clientPhone: "(480) 555-0404", clientEmail: "facilities@desertoasis.com", type: "commercial", volumeGallons: 80000, monthlyRate: 800, serviceDay: "Daily" },
  { id: 5, name: "Thompson Backyard", clientName: "Beth Thompson", address: "310 Oak Ave, Chandler, AZ", clientPhone: "(480) 555-0505", clientEmail: "bthompson@email.com", type: "residential", volumeGallons: 8000, monthlyRate: 100, serviceDay: "Friday" },
];

export default function PoolsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "residential" | "commercial" | "hoa">("all");
  const { data, isLoading, isError } = usePools();

  const allPools = (data?.pools?.length ? data.pools : MOCK_POOLS) as typeof MOCK_POOLS;

  const pools = allPools.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q);
    const matchFilter = filter === "all" || p.type === filter;
    return matchSearch && matchFilter;
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
        <div className="flex gap-2 flex-wrap">
          {(["all", "residential", "commercial", "hoa"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f
                  ? "bg-pool-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All Pools" : f}
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
          Could not load from database — showing demo data. Connect your DATABASE_URL to see live pools.
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
                <span className="badge badge-slate capitalize ml-2 flex-shrink-0">{pool.type}</span>
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
                  <Link href={`/reports/new?pool=${pool.id}`}>
                    <button className="text-xs btn-primary py-1 px-2.5">+ Report</button>
                  </Link>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

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
