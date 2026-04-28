"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePools } from "@/hooks/useData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Plus, X, Loader2, CheckCircle2, Package,
  DollarSign, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";

const STATUS_META = {
  needed:    { label: "Needed",    color: "badge-red",   bg: "bg-red-50",     border: "border-red-200"    },
  ordered:   { label: "Ordered",   color: "badge-amber", bg: "bg-amber-50",   border: "border-amber-200"  },
  installed: { label: "Installed", color: "badge-blue",  bg: "bg-blue-50",    border: "border-blue-200"   },
  billed:    { label: "Billed",    color: "badge-green", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const NEXT_STATUS: Record<string, string> = {
  needed:    "ordered",
  ordered:   "installed",
  installed: "billed",
};

const NEXT_LABEL: Record<string, string> = {
  needed:    "Mark Ordered",
  ordered:   "Mark Installed",
  installed: "Mark Billed",
};

function useParts(companyId?: number) {
  return useQuery({
    queryKey: ["parts", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/parts?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to load parts");
      return res.json() as Promise<{ parts: any[] }>;
    },
    enabled: !!companyId,
  });
}

export default function PartsPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const { data: poolsData } = usePools();
  const { data, isLoading } = useParts(company?.id);

  const pools: any[]  = poolsData?.pools ?? [];
  const parts: any[]  = data?.parts ?? [];

  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState<"all"|"needed"|"ordered"|"installed"|"billed">("all");
  const [expanded,  setExpanded]  = useState<number | null>(null);
  const [updating,  setUpdating]  = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    poolId: "", name: "", partNumber: "", quantityNeeded: "1",
    quantityOnHand: "0", unitCost: "", notes: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const createPart = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parts"] }); setShowNew(false); setForm({ poolId: "", name: "", partNumber: "", quantityNeeded: "1", quantityOnHand: "0", unitCost: "", notes: "" }); },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError("Part name is required"); return; }
    setFormError("");
    await createPart.mutateAsync({
      companyId:      company!.id,
      poolId:         form.poolId ? parseInt(form.poolId) : undefined,
      name:           form.name.trim(),
      partNumber:     form.partNumber || undefined,
      quantityNeeded: parseInt(form.quantityNeeded) || 1,
      quantityOnHand: parseInt(form.quantityOnHand) || 0,
      unitCost:       form.unitCost ? parseFloat(form.unitCost) : undefined,
      notes:          form.notes || undefined,
    });
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await fetch("/api/parts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      qc.invalidateQueries({ queryKey: ["parts"] });
    } finally { setUpdating(null); }
  };

  const deletePart = async (id: number) => {
    await fetch(`/api/parts?id=${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["parts"] });
  };

  const filtered = parts.filter(p => filter === "all" || p.status === filter);
  const needed   = parts.filter(p => p.status === "needed").length;
  const ordered  = parts.filter(p => p.status === "ordered").length;
  const totalCost = parts.filter(p => p.status === "needed" || p.status === "ordered")
    .reduce((s, p) => s + ((p.unit_cost ?? 0) * (p.quantity_needed ?? 1)), 0);

  const groupedByStatus = ["needed","ordered","installed","billed"].reduce((acc, s) => {
    acc[s] = filtered.filter(p => p.status === s);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#1756a9]" /> Parts & Shopping List
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track parts needed, ordered, and installed across all pools</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Part
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Parts Needed",    value: needed,                          color: "text-red-600",    bg: "bg-red-50",     icon: AlertTriangle },
          { label: "Parts Ordered",   value: ordered,                         color: "text-amber-600",  bg: "bg-amber-50",   icon: Package       },
          { label: "Open Cost Est.",  value: `$${totalCost.toFixed(2)}`,      color: "text-[#1756a9]",  bg: "bg-[#e8f1fc]",  icon: DollarSign    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New part form */}
      {showNew && (
        <div className="card p-6 border-2 border-pool-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Add Part</h2>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Part Name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Hayward pump seal kit, DE filter grid…" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="label">Pool (optional)</label>
              <select className="input" value={form.poolId} onChange={set("poolId")}>
                <option value="">Not pool-specific</option>
                {pools.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Part Number</label>
              <input className="input" placeholder="HAY-SPX1600Z1" value={form.partNumber} onChange={set("partNumber")} />
            </div>
            <div>
              <label className="label">Qty Needed</label>
              <input type="number" className="input" value={form.quantityNeeded} onChange={set("quantityNeeded")} min={1} />
            </div>
            <div>
              <label className="label">Qty On Hand</label>
              <input type="number" className="input" value={form.quantityOnHand} onChange={set("quantityOnHand")} min={0} />
            </div>
            <div>
              <label className="label">Unit Cost ($)</label>
              <input type="number" className="input" placeholder="24.99" value={form.unitCost} onChange={set("unitCost")} step="0.01" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Amazon B001234, supplier notes…" value={form.notes} onChange={set("notes")} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createPart.isPending} className="btn-primary flex-1">
              {createPart.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Part"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {(["all","needed","ordered","installed","billed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f === "all" ? `All (${parts.length})` : `${f.charAt(0).toUpperCase()}${f.slice(1)} (${parts.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-pool-500" /></div>}

      {/* Parts grouped by status */}
      {!isLoading && (
        <div className="space-y-6">
          {filter === "all"
            ? (["needed","ordered","installed","billed"] as const).map(s => {
                const group = groupedByStatus[s];
                if (group.length === 0) return null;
                const meta = STATUS_META[s];
                return (
                  <div key={s}>
                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl ${meta.bg} border ${meta.border}`}>
                      <span className={`${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-slate-500 ml-1">{group.length} item{group.length !== 1 ? "s" : ""}</span>
                    </div>
                    <PartList parts={group} pools={pools} updating={updating} onUpdateStatus={updateStatus} onDelete={deletePart} expanded={expanded} onExpand={setExpanded} />
                  </div>
                );
              })
            : <PartList parts={filtered} pools={pools} updating={updating} onUpdateStatus={updateStatus} onDelete={deletePart} expanded={expanded} onExpand={setExpanded} />
          }

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No parts {filter !== "all" ? `with status "${filter}"` : "tracked yet"}</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4">+ Add First Part</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PartList({ parts, pools, updating, onUpdateStatus, onDelete, expanded, onExpand }: {
  parts: any[]; pools: any[]; updating: number | null;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  expanded: number | null;
  onExpand: (id: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      {parts.map((part: any) => {
        const meta     = STATUS_META[part.status as keyof typeof STATUS_META] ?? STATUS_META.needed;
        const pool     = pools.find(p => p.id === part.pool_id);
        const isOpen   = expanded === part.id;
        const nextStat = NEXT_STATUS[part.status];
        const totalCost = (part.unit_cost ?? 0) * (part.quantity_needed ?? 1);

        return (
          <div key={part.id} className={`card overflow-hidden border ${meta.border} ${meta.bg}`}>
            <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => onExpand(isOpen ? null : part.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`${meta.color}`}>{meta.label}</span>
                  {part.part_number && <span className="text-xs text-slate-400 font-mono">{part.part_number}</span>}
                </div>
                <p className="font-semibold text-slate-900">{part.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pool ? `📍 ${pool.name}` : "General"}
                  {" · "}Qty: {part.quantity_needed ?? 1}
                  {part.unit_cost ? ` · $${totalCost.toFixed(2)}` : ""}
                </p>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </div>

            {isOpen && (
              <div className="border-t border-slate-100 p-4 space-y-3 bg-white">
                {part.notes && <p className="text-sm text-slate-600">{part.notes}</p>}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-slate-400">Qty needed</span><p className="font-semibold">{part.quantity_needed}</p></div>
                  <div><span className="text-slate-400">On hand</span><p className="font-semibold">{part.quantity_on_hand}</p></div>
                  {part.unit_cost && <div><span className="text-slate-400">Unit cost</span><p className="font-semibold">${part.unit_cost}</p></div>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {nextStat && (
                    <button
                      onClick={() => onUpdateStatus(part.id, nextStat)}
                      disabled={updating === part.id}
                      className="btn-primary text-sm flex items-center gap-1.5"
                    >
                      {updating === part.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {NEXT_LABEL[part.status]}
                    </button>
                  )}
                  {part.status === "installed" && (
                    <Link href={`/invoices?part=${part.id}&amount=${totalCost.toFixed(2)}&title=${encodeURIComponent(part.name)}`}>
                      <button className="btn-secondary text-sm flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Add to Invoice
                      </button>
                    </Link>
                  )}
                  <button onClick={() => onDelete(part.id)} className="text-sm text-red-400 hover:text-red-600 px-2">Remove</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
