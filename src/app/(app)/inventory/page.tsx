"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Plus, Minus, ShoppingCart, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function InventoryPage() {
  const { company } = useAuth();
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all"|"low">("all");

  const load = () => {
    if (!company) return;
    fetch(`/api/inventory?companyId=${company.id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [company]);

  const adjust = async (itemId: number, qty: number) => {
    await fetch("/api/inventory", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", companyId: company?.id, itemId, qty }),
    });
    load();
  };

  const inventory: any[] = data?.inventory ?? [];
  const lowStock:  any[] = data?.lowStock  ?? [];
  const shown = filter === "low" ? lowStock : inventory;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#1756a9]" />
            Chemical Inventory
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track truck stock — get low alerts before you run out mid-route</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Chemical
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">
              {lowStock.length} chemical{lowStock.length > 1 ? "s" : ""} running low
            </p>
            <p className="text-sm text-red-700 mt-0.5">
              {lowStock.map((i: any) => i.name).join(", ")}
            </p>
          </div>
          <a
            href="https://www.amazon.com/s?k=pool+chemicals"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-danger text-xs py-1.5 px-3"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Shop Now
          </a>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Items</p>
          <p className="stat-value">{inventory.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Low Stock</p>
          <p className="stat-value text-red-600">{lowStock.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Est. Value</p>
          <p className="stat-value">
            ${inventory.reduce((s: number, i: any) => s + (i.currentQty * (i.costPerUnit ?? 0)), 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all","low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? "bg-[#1756a9] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All Chemicals" : `Low Stock (${lowStock.length})`}
          </button>
        ))}
      </div>

      {/* Inventory grid */}
      <div className="grid lg:grid-cols-2 gap-3">
        {shown.map((item: any) => {
          const isLow  = item.currentQty <= item.minQty;
          const pct    = Math.min(100, Math.round((item.currentQty / Math.max(item.minQty * 2, 1)) * 100));

          return (
            <div key={item.id} className={`card p-4 ${isLow ? "border-red-200 bg-red-50" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Min: {item.minQty} {item.unit}</p>
                </div>
                {isLow && <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </div>

              {/* Stock bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}>
                    {item.currentQty} {item.unit}
                  </span>
                  <span className="text-slate-400">on truck</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isLow ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Adjust buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjust(item.id, -1)}
                  className="btn-outline py-1 px-3 text-sm"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="flex-1 text-center text-sm font-mono text-slate-600">
                  {item.currentQty} {item.unit}
                </span>
                <button
                  onClick={() => adjust(item.id, 1)}
                  className="btn-secondary py-1 px-3 text-sm"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {isLow && (
                  <a
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(item.name + " pool")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-danger py-1 px-3 text-xs"
                  >
                    Buy
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {shown.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">All chemicals well-stocked</p>
          <p className="text-sm mt-1">You're good to go!</p>
        </div>
      )}
    </div>
  );
}
