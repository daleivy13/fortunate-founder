"use client";

import { useState } from "react";
import { Receipt, Plus, Send, DollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const INVOICES = [
  { id: "INV-001", client: "Johnson Residence", email: "mjohnson@email.com", amount: 150, status: "paid", due: "Apr 1", paid: "Mar 28", items: [{ desc: "Monthly pool service — April", qty: 1, rate: 150 }] },
  { id: "INV-002", client: "Park Estates HOA", email: "hoa@parkestates.com", amount: 400, status: "sent", due: "Apr 15", paid: null, items: [{ desc: "Monthly pool service — April", qty: 1, rate: 350 }, { desc: "Chemical treatment (emergency)", qty: 1, rate: 50 }] },
  { id: "INV-003", client: "Rivera Family", email: "crivera@email.com", amount: 120, status: "overdue", due: "Apr 1", paid: null, items: [{ desc: "Monthly pool service — April", qty: 1, rate: 120 }] },
  { id: "INV-004", client: "Desert Oasis Resort", email: "facilities@desertoasis.com", amount: 800, status: "draft", due: "May 1", paid: null, items: [{ desc: "Monthly commercial service — May", qty: 1, rate: 700 }, { desc: "Filter inspection & service", qty: 1, rate: 100 }] },
  { id: "INV-005", client: "Thompson Backyard", email: "bthompson@email.com", amount: 100, status: "paid", due: "Apr 1", paid: "Apr 2", items: [{ desc: "Monthly pool service — April", qty: 1, rate: 100 }] },
];

const STATUS = {
  paid:    { label: "Paid",    cls: "badge-green",  icon: CheckCircle2 },
  sent:    { label: "Sent",    cls: "badge-blue",   icon: Send },
  overdue: { label: "Overdue", cls: "badge-red",    icon: AlertCircle },
  draft:   { label: "Draft",   cls: "badge-slate",  icon: Clock },
};

export default function InvoicesPage() {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");

  const totalPaid = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOwed = INVOICES.filter((i) => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
  const overdue = INVOICES.filter((i) => i.status === "overdue").length;

  const filtered = INVOICES.filter((i) =>
    filter === "all" ? true :
    filter === "paid" ? i.status === "paid" :
    i.status === "sent" || i.status === "overdue" || i.status === "draft"
  );

  if (showNew) return <NewInvoiceForm onBack={() => setShowNew(false)} />;

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
      <div className="space-y-3">
        {filtered.map((inv) => {
          const s = STATUS[inv.status as keyof typeof STATUS];
          return (
            <div key={inv.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-slate-900">{inv.client}</p>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{inv.id} · {inv.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">${inv.amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {inv.status === "paid" ? `Paid ${inv.paid}` : `Due ${inv.due}`}
                  </p>
                </div>
              </div>

              {/* Line items */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                {inv.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.desc}</span>
                    <span className="font-medium text-slate-900">${item.rate}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {inv.status !== "paid" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  {inv.status === "draft" && (
                    <button className="btn-primary text-sm flex-1">
                      <Send className="w-3.5 h-3.5" /> Send Invoice
                    </button>
                  )}
                  {(inv.status === "sent" || inv.status === "overdue") && (
                    <>
                      <button className="btn-secondary text-sm">Resend</button>
                      <button className="btn-primary text-sm flex-1">
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
    </div>
  );
}

function NewInvoiceForm({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState([{ desc: "Monthly pool service", qty: 1, rate: "" }]);

  const total = items.reduce((s, i) => s + (parseFloat(i.rate) || 0) * i.qty, 0);

  const addItem = () => setItems((it) => [...it, { desc: "", qty: 1, rate: "" }]);
  const removeItem = (idx: number) => setItems((it) => it.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-outline py-1.5 px-3 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client Name</label>
            <select className="input">
              <option>Select pool / client...</option>
              <option>Johnson Residence</option>
              <option>Park Estates HOA</option>
              <option>Rivera Family</option>
              <option>Desert Oasis Resort</option>
              <option>Thompson Backyard</option>
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" />
          </div>
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
          <textarea className="input resize-none" rows={3} placeholder="Payment terms, thank you note, etc." />
        </div>

        <div className="flex gap-3">
          <button className="btn-outline flex-1">Save Draft</button>
          <button className="btn-primary flex-1">
            <Send className="w-4 h-4" /> Send Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
