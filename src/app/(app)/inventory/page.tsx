"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Plus, Minus, ShoppingCart, TrendingDown, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddForm { name: string; unit: string; minQty: string; costPerUnit: string }

export default function InventoryPage() {
  const { company } = useAuth();
  const [data,      setData]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<"all"|"low">("all");
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState<AddForm>({ name: "", unit: "gal", minQty: "2", costPerUnit: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addErr,    setAddErr]    = useState("");

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

  const addChemical = async () => {
    if (!addForm.name.trim()) { setAddErr("Name is required"); return; }
    setAddErr("");
    setAddSaving(true);
    try {
      await fetch("/api/inventory", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:      "add_item",
          companyId:   company?.id,
          name:        addForm.name.trim(),
          unit:        addForm.unit.trim() || "gal",
          minQty:      parseFloat(addForm.minQty) || 2,
          costPerUnit: parseFloat(addForm.costPerUnit) || 0,
        }),
      });
      setShowAdd(false);
      setAddForm({ name: "", unit: "gal", minQty: "2", costPerUnit: "" });
      load();
    } catch (err: any) {
      setAddErr(err.message ?? "Failed to add chemical");
    } finally {
      setAddSaving(false);
    }
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
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          Add Chemical
        </button>
      </div>

      {/* Add Chemical modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Add Chemical</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chemical Name *</label>
                <input
                  className="input"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Liquid Chlorine (10%)"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
                  <select
                    className="input"
                    value={addForm.unit}
                    onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                  >
                    {["gal","qt","lbs","oz","bags","tabs"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Qty</label>
                  <input
                    type="number"
                    className="input"
                    value={addForm.minQty}
                    onChange={(e) => setAddForm((f) => ({ ...f, minQty: e.target.value }))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost/Unit $</label>
                  <input
                    type="number"
                    className="input"
                    value={addForm.costPerUnit}
                    onChange={(e) => setAddForm((f) => ({ ...f, costPerUnit: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              {addErr && <p className="text-sm text-red-600">{addErr}</p>}
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={addChemical} disabled={addSaving} className="btn-primary flex-1">
                {addSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Chemical"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            ${inventory.reduce((s: number, i: any) => s + ((i.currentQty ?? i.current_qty ?? 0) * (i.costPerUnit ?? i.cost_per_unit ?? 0)), 0).toFixed(0)}
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-3">
            {shown.map((item: any) => {
              const curQty = item.currentQty ?? item.current_qty ?? 0;
              const minQty = item.minQty    ?? item.min_qty    ?? 0;
              const unit   = item.unit ?? "";
              const isLow  = curQty <= minQty;
              const pct    = Math.min(100, Math.round((curQty / Math.max(minQty * 2, 1)) * 100));

              return (
                <div key={item.id} className={`card p-4 ${isLow ? "border-red-200 bg-red-50" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Min: {minQty} {unit}</p>
                    </div>
                    {isLow && <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}>
                        {curQty} {unit}
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

                  <div className="flex items-center gap-2">
                    <button onClick={() => adjust(item.id, -1)} className="btn-outline py-1 px-3 text-sm">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="flex-1 text-center text-sm font-mono text-slate-600">
                      {curQty} {unit}
                    </span>
                    <button onClick={() => adjust(item.id, 1)} className="btn-secondary py-1 px-3 text-sm">
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

          {shown.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {filter === "low" ? (
                <>
                  <p className="font-medium">All chemicals well-stocked</p>
                  <p className="text-sm mt-1">You're good to go!</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No chemicals tracked yet</p>
                  <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">+ Add First Chemical</button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
