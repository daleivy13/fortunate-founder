"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePools, useEmployees } from "@/hooks/useData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench, Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle,
  Zap, ChevronDown, ChevronUp, DollarSign, User, Calendar, WifiOff,
} from "lucide-react";
import { enqueue } from "@/lib/offlineQueue";

const PRIORITIES = [
  { value: "urgent",  label: "Urgent",  color: "bg-red-100 text-red-700 border-red-300"     },
  { value: "high",    label: "High",    color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "normal",  label: "Normal",  color: "bg-blue-100 text-blue-700 border-blue-300"   },
  { value: "low",     label: "Low",     color: "bg-slate-100 text-slate-600 border-slate-200" },
];

const CATEGORIES = ["repair","replacement","upgrade","inspection","other"];

const STATUSES = [
  { value: "pending",     label: "Pending",     icon: Clock,         color: "badge-amber" },
  { value: "in_progress", label: "In Progress", icon: Zap,           color: "badge-blue"  },
  { value: "complete",    label: "Complete",    icon: CheckCircle2,  color: "badge-green" },
  { value: "cancelled",   label: "Cancelled",   icon: X,             color: "bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full" },
];

function priorityBadge(p: string) {
  return PRIORITIES.find(x => x.value === p) ?? PRIORITIES[2];
}
function statusInfo(s: string) {
  return STATUSES.find(x => x.value === s) ?? STATUSES[0];
}

function useWorkOrders(companyId?: number) {
  return useQuery({
    queryKey: ["work-orders", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch work orders");
      return res.json() as Promise<{ workOrders: any[] }>;
    },
    enabled: !!companyId,
  });
}

function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/work-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/work-orders", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

export default function WorkOrdersPage() {
  const { company } = useAuth();
  const { data: woData, isLoading } = useWorkOrders(company?.id);
  const { data: poolsData } = usePools();
  const { data: empData }   = useEmployees();
  const createWO  = useCreateWorkOrder();
  const updateWO  = useUpdateWorkOrder();

  const workOrders: any[] = woData?.workOrders ?? [];
  const pools: any[]      = poolsData?.pools ?? [];
  const employees: any[]  = empData?.employees ?? [];

  const [filter, setFilter] = useState<"all"|"pending"|"in_progress"|"complete">("all");
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({
    poolId: "", title: "", description: "", priority: "normal",
    category: "repair", estimatedCost: "", scheduledAt: "", assignedTo: "",
  });
  const [formError, setFormError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.poolId || !form.title.trim()) { setFormError("Pool and title are required"); return; }
    setFormError("");
    try {
      await createWO.mutateAsync({
        companyId:     company!.id,
        poolId:        parseInt(form.poolId),
        title:         form.title.trim(),
        description:   form.description || undefined,
        priority:      form.priority,
        category:      form.category,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        scheduledAt:   form.scheduledAt || undefined,
        assignedTo:    form.assignedTo || undefined,
      });
      setForm({ poolId:"", title:"", description:"", priority:"normal", category:"repair", estimatedCost:"", scheduledAt:"", assignedTo:"" });
      setShowNew(false);
    } catch (e: any) { setFormError(e.message); }
  };

  const updateStatus = async (id: number, status: string) => {
    const payload = { id, status, ...(status === "complete" ? { completedAt: new Date().toISOString() } : {}) };
    if (!navigator.onLine) {
      await enqueue({ url: "/api/work-orders", method: "PATCH", body: JSON.stringify(payload), label: `Work order #${id} → ${status}` });
      return;
    }
    updateWO.mutate(payload);
  };

  const filtered = workOrders.filter(wo =>
    filter === "all" ? wo.status !== "cancelled" : wo.status === filter
  );

  const openCount     = workOrders.filter(w => w.status === "pending" || w.status === "in_progress").length;
  const urgentCount   = workOrders.filter(w => w.priority === "urgent" && w.status !== "complete" && w.status !== "cancelled").length;
  const completeCount = workOrders.filter(w => w.status === "complete").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Repairs, replacements, and special jobs — separate from routine service</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open",     value: openCount,     color: "text-amber-600",  bg: "bg-amber-50"   },
          { label: "Urgent",   value: urgentCount,   color: "text-red-600",    bg: "bg-red-50"     },
          { label: "Complete", value: completeCount, color: "text-emerald-600",bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New WO form */}
      {showNew && (
        <div className="card p-6 border-2 border-pool-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">New Work Order</h2>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Title <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Replace pool pump impeller" value={form.title} onChange={set("title")} />
            </div>
            <div>
              <label className="label">Pool <span className="text-red-500">*</span></label>
              <select className="input" value={form.poolId} onChange={set("poolId")}>
                <option value="">Select pool…</option>
                {pools.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set("category")}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={set("priority")}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estimated Cost</label>
              <input type="number" className="input" placeholder="250" value={form.estimatedCost} onChange={set("estimatedCost")} />
            </div>
            <div>
              <label className="label">Scheduled Date</label>
              <input type="date" className="input" value={form.scheduledAt} onChange={set("scheduledAt")} />
            </div>
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assignedTo} onChange={set("assignedTo")}>
                <option value="">Unassigned</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe the work needed, parts required, any client notes…" value={form.description} onChange={set("description")} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createWO.isPending} className="btn-primary flex-1">
              {createWO.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Work Order"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["all","pending","in_progress","complete"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Work order list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-pool-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No work orders</p>
          <p className="text-sm mt-1">Create one for repairs, equipment replacements, or special jobs</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">+ New Work Order</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wo: any) => {
            const pb = priorityBadge(wo.priority);
            const si = statusInfo(wo.status);
            const isOpen = expanded === wo.id;

            return (
              <div key={wo.id} className={`card overflow-hidden border ${wo.priority === "urgent" && wo.status === "pending" ? "border-red-300 bg-red-50/30" : ""}`}>
                {/* Summary row */}
                <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : wo.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pb.color}`}>{pb.label}</span>
                      <span className={si.color}>{si.label}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{wo.category}</span>
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{wo.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {wo.pool_name} · {wo.client_name}
                      {wo.scheduled_at && ` · Scheduled ${new Date(wo.scheduled_at).toLocaleDateString()}`}
                      {wo.estimated_cost && ` · Est. $${wo.estimated_cost}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {wo.description && (
                      <p className="text-sm text-slate-600 leading-relaxed">{wo.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {wo.assigned_to && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Assigned to: <span className="font-medium">{employees.find(e => e.id === wo.assigned_to)?.name ?? wo.assigned_to}</span>
                        </div>
                      )}
                      {wo.actual_cost && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          Actual cost: <span className="font-medium">${wo.actual_cost}</span>
                        </div>
                      )}
                      {wo.completed_at && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Completed: <span className="font-medium">{new Date(wo.completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {wo.tech_notes && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-500 mb-1">Tech Notes</p>
                        <p className="text-sm text-slate-700">{wo.tech_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {wo.status !== "complete" && wo.status !== "cancelled" && (
                        <>
                          {wo.status === "pending" && (
                            <button onClick={() => updateStatus(wo.id, "in_progress")} className="btn-secondary text-sm flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5" /> Start Work
                            </button>
                          )}
                          {(wo.status === "pending" || wo.status === "in_progress") && (
                            <button onClick={() => updateStatus(wo.id, "complete")} className="btn-primary text-sm flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                            </button>
                          )}
                          <button onClick={() => updateStatus(wo.id, "cancelled")}
                            className="text-sm text-red-500 hover:text-red-700 px-3 py-2">
                            Cancel
                          </button>
                        </>
                      )}
                      {wo.status === "complete" && !wo.invoiceId && (
                        <a
                          href={`/invoices?wo=${wo.id}&pool=${wo.pool_id}&client=${encodeURIComponent(wo.client_name ?? "")}&amount=${wo.actual_cost ?? wo.estimated_cost ?? ""}&title=${encodeURIComponent(wo.title)}`}
                          className="btn-secondary text-sm flex items-center gap-1.5"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Create Invoice
                        </a>
                      )}
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
