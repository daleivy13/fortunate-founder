"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, Plus, Send, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useInvoices, useCreateInvoice, useUpdateInvoice } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { usePools } from "@/hooks/useData";

const STATUS = {
  paid:    { label: "Paid",    cls: "badge-green",  icon: CheckCircle2 },
  sent:    { label: "Sent",    cls: "badge-blue",   icon: Send },
  overdue: { label: "Overdue", cls: "badge-red",    icon: AlertCircle },
  draft:   { label: "Draft",   cls: "badge-slate",  icon: Clock },
};

export default function InvoicesPage() {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const { data, isLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();
  const searchParams = useSearchParams();
  const woPreset = searchParams.get("wo") ? {
    poolId:     searchParams.get("pool") ?? "",
    clientName: searchParams.get("client") ?? "",
    amount:     searchParams.get("amount") ?? "",
    title:      searchParams.get("title") ?? "",
  } : null;

  useEffect(() => {
    if (woPreset) setShowNew(true);
  }, []);

  const invoices = data?.invoices ?? [];

  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
  const totalOwed = invoices.filter((i: any) => i.status !== "paid" && i.status !== "draft").reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
  const overdue   = invoices.filter((i: any) => i.status === "overdue").length;

  const filtered = invoices.filter((i: any) =>
    filter === "all"  ? true :
    filter === "paid" ? i.status === "paid" :
    i.status === "sent" || i.status === "overdue"
  );

  const sendInvoice = async (inv: any) => {
    const res = await fetch(`/api/invoices/${inv.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "send" }),
    });
    const data = await res.json();
    if (data.paymentUrl) window.open(data.paymentUrl, "_blank");
    updateInvoice.mutate({ id: inv.id, status: "sent" });
  };

  const markPaid = (id: number) => updateInvoice.mutate({ id, action: "mark_paid" });

  if (showNew) return <NewInvoiceForm onBack={() => setShowNew(false)} onDone={() => setShowNew(false)} preset={woPreset} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Stripe-powered billing for your clients</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Collected This Month</p>
          <p className="stat-value text-emerald-600">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value text-amber-600">${totalOwed.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Overdue</p>
          <p className="stat-value text-red-600">{overdue} invoice{overdue !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* AR Aging */}
      {(() => {
        const now = Date.now();
        const aging = [
          { label: "Current (0–30 days)", invoices: invoices.filter((i: any) => i.status === "sent" && (now - new Date(i.createdAt).getTime()) < 30*86400000) },
          { label: "30–60 days",          invoices: invoices.filter((i: any) => (i.status === "sent"||i.status==="overdue") && (now - new Date(i.createdAt).getTime()) >= 30*86400000 && (now - new Date(i.createdAt).getTime()) < 60*86400000) },
          { label: "60–90 days",          invoices: invoices.filter((i: any) => (i.status === "sent"||i.status==="overdue") && (now - new Date(i.createdAt).getTime()) >= 60*86400000 && (now - new Date(i.createdAt).getTime()) < 90*86400000) },
          { label: "90+ days",            invoices: invoices.filter((i: any) => (i.status === "sent"||i.status==="overdue") && (now - new Date(i.createdAt).getTime()) >= 90*86400000) },
        ].filter(a => a.invoices.length > 0);
        if (aging.length === 0) return null;
        return (
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3">Accounts Receivable Aging</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {aging.map(a => {
                const total = a.invoices.reduce((s: number, i: any) => s + parseFloat(i.amount ?? 0), 0);
                const isOld = a.label.startsWith("60") || a.label.startsWith("90");
                return (
                  <div key={a.label} className={`rounded-xl p-3 border ${isOld ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                    <p className="text-xs text-slate-500 mb-1">{a.label}</p>
                    <p className={`text-lg font-bold ${isOld ? "text-red-700" : "text-amber-700"}`}>${total.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{a.invoices.length} invoice{a.invoices.length !== 1 ? "s" : ""}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Stripe note */}
      <div className="bg-pool-50 border border-pool-200 rounded-xl p-4 flex items-start gap-3">
        <DollarSign className="w-4 h-4 text-pool-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-pool-900">Stripe Payments Ready</p>
          <p className="text-xs text-pool-700 mt-0.5">
            Add your Stripe keys to .env.local to enable one-click invoice sending with online payment links.
            Clients pay directly by card — funds deposited to your bank account.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([["all", "All"], ["unpaid", "Unpaid"], ["paid", "Paid"]] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === val ? "bg-pool-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No invoices yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first invoice to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv: any) => {
            const s = STATUS[inv.status as keyof typeof STATUS] ?? STATUS.draft;
            let lineItems: any[] = [];
            try { lineItems = JSON.parse(inv.lineItems ?? "[]"); } catch {}
            return (
              <div key={inv.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-slate-900">{inv.clientName}</p>
                      <span className={s.cls}>{s.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">#{inv.id} · {inv.clientEmail ?? "No email"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">${parseFloat(inv.amount).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.status === "paid"
                        ? `Paid ${new Date(inv.paidAt ?? inv.updatedAt).toLocaleDateString()}`
                        : inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "No due date"}
                    </p>
                  </div>
                </div>

                {lineItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {lineItems.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.desc ?? item.description}</span>
                        <span className="font-medium text-slate-900">${(item.qty ?? 1) * (item.rate ?? item.amount ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {inv.status !== "paid" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    {inv.status === "draft" && (
                      <button
                        onClick={() => sendInvoice(inv)}
                        disabled={updateInvoice.isPending}
                        className="btn-primary text-sm flex-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Invoice
                      </button>
                    )}
                    {(inv.status === "sent" || inv.status === "overdue") && (
                      <>
                        <button
                          onClick={() => sendInvoice(inv)}
                          disabled={updateInvoice.isPending}
                          className="btn-secondary text-sm"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => markPaid(inv.id)}
                          disabled={updateInvoice.isPending}
                          className="btn-primary text-sm flex-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
                        </button>
                      </>
                    )}
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

function NewInvoiceForm({ onBack, onDone, preset }: { onBack: () => void; onDone: () => void; preset?: { poolId: string; clientName: string; amount: string; title: string } | null }) {
  const { company } = useAuth();
  const { data: poolsData } = usePools();
  const createInvoice = useCreateInvoice();
  const [items, setItems] = useState(() =>
    preset?.title && preset?.amount
      ? [{ desc: preset.title, qty: 1, rate: preset.amount }]
      : [{ desc: "Monthly pool service", qty: 1, rate: "" as string }]
  );
  const [clientName, setClientName]   = useState(preset?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate]         = useState("");
  const [notes, setNotes]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const pools = poolsData?.pools ?? [];
  const total = items.reduce((s, i) => s + (parseFloat(i.rate) || 0) * i.qty, 0);

  const addItem    = () => setItems((it) => [...it, { desc: "", qty: 1, rate: "" }]);
  const removeItem = (idx: number) => setItems((it) => it.filter((_, i) => i !== idx));

  const save = async (send: boolean) => {
    if (!clientName.trim()) { setError("Client name is required"); return; }
    if (items.every((i) => !parseFloat(i.rate))) { setError("Add at least one line item with a price"); return; }
    setSaving(true);
    setError("");
    try {
      const lineItems = items
        .filter((i) => i.desc || parseFloat(i.rate))
        .map((i) => ({ desc: i.desc, qty: i.qty, rate: parseFloat(i.rate) || 0 }));

      const inv = await createInvoice.mutateAsync({
        companyId:   company!.id,
        clientName,
        clientEmail: clientEmail || null,
        dueDate:     dueDate || null,
        notes:       notes || null,
        lineItems:   JSON.stringify(lineItems),
      });

      if (send && inv.invoice?.id && clientEmail) {
        await fetch(`/api/invoices/${inv.invoice.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "sent", sendEmail: true }),
        });
      }

      onDone();
    } catch (err: any) {
      setError(err.message ?? "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-outline py-1.5 px-3 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
      )}

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client Name</label>
            {pools.length > 0 ? (
              <select
                className="input"
                value={clientName}
                onChange={(e) => {
                  const pool = pools.find((p: any) => p.clientName === e.target.value);
                  setClientName(e.target.value);
                  if (pool?.clientEmail) setClientEmail(pool.clientEmail);
                }}
              >
                <option value="">Select client...</option>
                {pools.map((p: any) => (
                  <option key={p.id} value={p.clientName}>{p.clientName} — {p.name}</option>
                ))}
              </select>
            ) : (
              <input className="input" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            )}
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Client Email</label>
          <input
            type="email"
            className="input"
            placeholder="client@example.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Line Items</label>
            <button onClick={addItem} className="text-sm text-pool-600 font-medium hover:underline">+ Add item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="input col-span-6"
                  placeholder="Description"
                  value={item.desc}
                  onChange={(e) => setItems((it) => it.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                />
                <input
                  className="input col-span-2 text-center"
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  min={1}
                  onChange={(e) => setItems((it) => it.map((x, j) => j === i ? { ...x, qty: parseInt(e.target.value) || 1 } : x))}
                />
                <div className="relative col-span-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    className="input pl-6"
                    type="number"
                    placeholder="0.00"
                    value={item.rate}
                    onChange={(e) => setItems((it) => it.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))}
                  />
                </div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="col-span-1 text-slate-400 hover:text-red-500 text-lg font-bold">×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="font-bold text-slate-900">Total</span>
          <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Payment terms, thank you note, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => save(false)} disabled={saving} className="btn-outline flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Invoice</>}
          </button>
        </div>
      </div>
    </div>
  );
}
