"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench, AlertTriangle, CheckCircle2, Clock, Loader2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_BRANDS, getCategoryInfo } from "@/lib/equipment-categories";
import { usePools } from "@/hooks/useData";
import Link from "next/link";

const CONDITION_COLORS: Record<string, string> = {
  excellent: "badge-green",
  good:      "badge-brand",
  fair:      "badge-amber",
  poor:      "badge-red",
};

type FilterTab = "all" | "alerts" | "service_overdue" | "warranty_expiring";

export default function EquipmentPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const { data: poolsData } = usePools();
  const pools: any[] = poolsData?.pools ?? [];

  const [filter,    setFilter]    = useState<FilterTab>("all");
  const [showAdd,   setShowAdd]   = useState(false);
  const [expanded,  setExpanded]  = useState<number | null>(null);
  const [logging,   setLogging]   = useState<number | null>(null);

  const [form, setForm] = useState({
    poolId: "", category: "pump_standard", name: "", brand: "", model: "",
    serialNumber: "", installedAt: "", warrantyExpires: "",
    serviceIntervalDays: "", condition: "good", notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["equipment-all", company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?companyId=${company!.id}`);
      return res.json() as Promise<{ equipment: any[] }>;
    },
    enabled: !!company?.id,
  });

  const addEquipment = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch("/api/equipment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add equipment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment-all"] });
      setShowAdd(false);
      setForm({ poolId:"", category:"pump_standard", name:"", brand:"", model:"", serialNumber:"", installedAt:"", warrantyExpires:"", serviceIntervalDays:"", condition:"good", notes:"" });
    },
  });

  const logService = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/equipment", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, logService: true }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment-all"] }),
  });

  const allEquipment: any[] = data?.equipment ?? [];

  const filtered = allEquipment.filter(eq => {
    if (filter === "all") return true;
    if (filter === "alerts") return (eq.alerts ?? []).length > 0;
    if (filter === "service_overdue") return eq.daysLeft !== null && eq.daysLeft < 0;
    if (filter === "warranty_expiring") {
      if (!eq.warranty_exp && !eq.warranty_expires) return false;
      const exp = new Date(eq.warranty_exp ?? eq.warranty_expires).getTime();
      const days = Math.floor((exp - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }
    return true;
  });

  const alertCount       = allEquipment.filter(e => (e.alerts ?? []).length > 0).length;
  const overdueCount     = allEquipment.filter(e => e.daysLeft !== null && e.daysLeft < 0).length;
  const warrantyCount    = allEquipment.filter(e => {
    const exp = e.warranty_exp ?? e.warranty_expires;
    if (!exp) return false;
    const days = Math.floor((new Date(exp).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  const handleCreate = async () => {
    if (!form.poolId || !form.category) return;
    const catInfo = getCategoryInfo(form.category);
    await addEquipment.mutateAsync({
      poolId:              parseInt(form.poolId),
      name:                form.name || catInfo.label,
      category:            form.category,
      brand:               form.brand || undefined,
      model:               form.model || undefined,
      serialNumber:        form.serialNumber || undefined,
      installedAt:         form.installedAt || undefined,
      warrantyExpires:     form.warrantyExpires || undefined,
      serviceIntervalDays: form.serviceIntervalDays || catInfo.serviceIntervalDays,
      condition:           form.condition,
      notes:               form.notes || undefined,
    });
  };

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all",               label: "All",                count: allEquipment.length },
    { key: "alerts",            label: "Alerts",             count: alertCount },
    { key: "service_overdue",   label: "Service Overdue",    count: overdueCount },
    { key: "warranty_expiring", label: "Warranty Expiring",  count: warrantyCount },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipment Register</h1>
          <p className="text-slate-500 text-sm mt-1">Track warranties, service schedules, and conditions across all pools</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Equipment</p>
          <p className="stat-value">{allEquipment.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Need Attention</p>
          <p className="stat-value text-amber-600">{alertCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Service Overdue</p>
          <p className="stat-value text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-6 border-2 border-pool-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Add Equipment</h2>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pool <span className="text-red-500">*</span></label>
              <select className="input" value={form.poolId} onChange={e => setForm(p => ({ ...p, poolId: e.target.value }))}>
                <option value="">Select pool…</option>
                {pools.map(p => <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category <span className="text-red-500">*</span></label>
              <select className="input" value={form.category} onChange={e => {
                const cat = getCategoryInfo(e.target.value);
                setForm(p => ({ ...p, category: e.target.value, name: cat.label, serviceIntervalDays: String(cat.serviceIntervalDays) }));
              }}>
                {Object.values(EQUIPMENT_CATEGORIES).map(c => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder={getCategoryInfo(form.category).label} value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Brand</label>
              <select className="input" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}>
                <option value="">Select brand…</option>
                {EQUIPMENT_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="Model number" value={form.model}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input className="input" placeholder="Optional" value={form.serialNumber}
                onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label">Install Date</label>
              <input type="date" className="input" value={form.installedAt}
                onChange={e => setForm(p => ({ ...p, installedAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Warranty Expires</label>
              <input type="date" className="input" value={form.warrantyExpires}
                onChange={e => setForm(p => ({ ...p, warrantyExpires: e.target.value }))} />
            </div>
            <div>
              <label className="label">Service Interval (days)</label>
              <input type="number" className="input" value={form.serviceIntervalDays}
                onChange={e => setForm(p => ({ ...p, serviceIntervalDays: e.target.value }))} />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}>
                {["excellent","good","fair","poor"].map(c => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={addEquipment.isPending || !form.poolId}
              className="btn-primary flex-1">
              {addEquipment.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Equipment"}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${t.key === "all" ? "bg-slate-200 text-slate-600" : "bg-red-100 text-red-600"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Equipment list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-pool-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No equipment found</p>
          <p className="text-slate-400 text-sm mt-1">Add equipment to track warranties and service schedules</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">+ Add Equipment</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((eq: any) => {
            const cat    = getCategoryInfo(eq.category);
            const isExp  = expanded === eq.id;
            const alerts: string[] = eq.alerts ?? [];
            const hasAlert = alerts.length > 0;

            return (
              <div key={eq.id} className={`card border overflow-hidden ${hasAlert ? "border-amber-200" : "border-slate-200"}`}>
                <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : eq.id)}>
                  <div className="text-2xl flex-shrink-0">{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-900">{eq.name ?? cat.label}</p>
                      {eq.condition && (
                        <span className={`${CONDITION_COLORS[eq.condition] ?? "badge-slate"} capitalize`}>
                          {eq.condition}
                        </span>
                      )}
                      {hasAlert && <span className="badge-red">⚠ Alert</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      {eq.pool_name ?? `Pool #${eq.pool_id}`}
                      {eq.brand ? ` · ${eq.brand}` : ""}
                      {eq.model ? ` ${eq.model}` : ""}
                    </p>
                    {alerts.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {alerts.map((a, i) => <span key={i} className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{a}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setLogging(eq.id); logService.mutate(eq.id, { onSettled: () => setLogging(null) }); }}
                      disabled={logService.isPending && logService.variables === eq.id}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      {logService.isPending && logService.variables === eq.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : "Log Service"
                      }
                    </button>
                    {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-slate-100 p-4 grid grid-cols-2 gap-3 text-sm bg-slate-50/50">
                    {[
                      { label: "Category",         value: cat.label },
                      { label: "Install Date",      value: eq.installed_at ? new Date(eq.installed_at).toLocaleDateString() : "—" },
                      { label: "Warranty Expires",  value: eq.warranty_exp ? new Date(eq.warranty_exp).toLocaleDateString() : eq.warranty_expires ? new Date(eq.warranty_expires).toLocaleDateString() : "—" },
                      { label: "Last Serviced",     value: eq.last_serviced_at ? new Date(eq.last_serviced_at).toLocaleDateString() : "Never" },
                      { label: "Service Interval",  value: eq.service_interval_days ? `Every ${eq.service_interval_days} days` : "—" },
                      { label: "Serial #",          value: eq.serial_number ?? "—" },
                    ].map(row => (
                      <div key={row.label}>
                        <p className="text-xs text-slate-400">{row.label}</p>
                        <p className="font-medium text-slate-800">{row.value}</p>
                      </div>
                    ))}
                    {eq.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-400">Notes</p>
                        <p className="text-slate-700">{eq.notes}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Link href={`/pools/${eq.pool_id}`}>
                        <button className="btn-outline text-xs">View Pool →</button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
