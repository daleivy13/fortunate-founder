"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, Plus, CheckCircle2, Clock, Send, Download, Camera, Loader2, ArrowLeft } from "lucide-react";
import { useReports, useCreateReport, usePools } from "@/hooks/useData";
import Link from "next/link";

const CHECKS_LABELS = [
  { key: "skimmed",         label: "Skimmed" },
  { key: "brushed",         label: "Brushed walls & floor" },
  { key: "vacuumed",        label: "Vacuumed" },
  { key: "filterCleaned",   label: "Filter cleaned/inspected" },
  { key: "chemicalsAdded",  label: "Chemicals added" },
  { key: "equipmentChecked",label: "Equipment checked" },
];

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  sent:     { label: "PDF Sent",    cls: "badge-green" },
  complete: { label: "Complete",    cls: "badge-blue"  },
  pending:  { label: "In Progress", cls: "badge-amber" },
};

// ─── Report List ──────────────────────────────────────────────────────────────
function ReportList({ onNew }: { onNew: () => void }) {
  const [filter, setFilter] = useState<"all" | "pending" | "sent">("all");
  const { data, isLoading } = useReports();

  const reports: any[] = data?.reports ?? [];

  const filtered = reports.filter((r: any) => {
    const report = r.report ?? r;
    return filter === "all" ? true
      : filter === "pending" ? report.status === "pending"
      : report.status === "sent" || report.status === "complete";
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading..." : `${reports.length} reports`}
          </p>
        </div>
        <button onClick={onNew} className="btn-primary">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      <div className="flex gap-2">
        {([["all", "All"], ["pending", "In Progress"], ["sent", "Sent"]] as const).map(([val, label]) => (
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

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-pool-500" />
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item: any) => {
          const r = item.report ?? item;
          const pool = item.pool;
          const s = STATUS_DISPLAY[r.status] ?? STATUS_DISPLAY.complete;
          const date = r.servicedAt
            ? new Date(r.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
            : "—";

          return (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900">{pool?.name ?? `Pool #${r.poolId}`}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{pool?.clientName ?? ""} · {date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={s.cls}>{s.label}</span>
                  {(r.status === "sent" || r.status === "complete") && (
                    <a
                      href={`/api/reports/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View PDF"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {CHECKS_LABELS.map(({ key, label }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      r[key] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {r[key] ? "✓" : "○"} {label}
                  </div>
                ))}
              </div>

              {r.techNotes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{r.techNotes}</p>
              )}
              {r.issuesFound && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">⚠ {r.issuesFound}</p>
              )}

              {r.status === "pending" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <a href={`/api/reports/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm flex-1 text-center">
                    <Send className="w-4 h-4 inline mr-1" /> View PDF
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No reports yet</p>
          <p className="text-sm mt-1">Create your first service report</p>
          <button onClick={onNew} className="btn-primary mt-4">+ New Report</button>
        </div>
      )}
    </div>
  );
}

// ─── New Report Form ──────────────────────────────────────────────────────────
function NewReportForm({ onBack, defaultPoolId }: { onBack: () => void; defaultPoolId?: string }) {
  const { mutateAsync: createReport, isPending } = useCreateReport();
  const { data: poolsData } = usePools();
  const pools = poolsData?.pools ?? [];

  const [poolId, setPoolId] = useState(defaultPoolId ?? "");
  const [checks, setChecks] = useState({
    skimmed: false, brushed: false, vacuumed: false,
    filterCleaned: false, chemicalsAdded: false, equipmentChecked: false,
  });
  const [cl, setCl] = useState("");
  const [ph, setPh] = useState("");
  const [ta, setTa] = useState("");
  const [temp, setTemp] = useState("");
  const [issues, setIssues] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const toggle = (k: keyof typeof checks) =>
    setChecks((c) => ({ ...c, [k]: !c[k] }));

  const handleSubmit = async () => {
    if (!poolId) { setError("Please select a pool"); return; }
    setError("");
    try {
      const res = await createReport({
        poolId,
        freeChlorine: cl || null,
        ph: ph || null,
        totalAlkalinity: ta || null,
        waterTemp: temp || null,
        ...checks,
        issuesFound: issues || null,
        techNotes: notes || null,
      });
      setReportId(res.report.id);
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to save report");
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Report Saved!</h2>
        <div className="flex gap-3">
          {reportId && (
            <a href={`/api/reports/${reportId}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <Download className="w-4 h-4" /> View PDF Report
            </a>
          )}
          <button onClick={onBack} className="btn-outline">Back to Reports</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-outline py-1.5 px-3 text-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Service Report</h1>
          <p className="text-slate-500 text-sm">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          {/* Pool + chemistry */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-slate-900">Pool & Chemistry</h2>
            <div>
              <label className="label">Pool <span className="text-red-500">*</span></label>
              <select className="input" value={poolId} onChange={(e) => setPoolId(e.target.value)}>
                <option value="">Select pool...</option>
                {pools.length > 0
                  ? pools.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)
                  : ["Johnson Residence", "Park Estates HOA", "Rivera Family", "Desert Oasis Resort", "Thompson Backyard"]
                      .map((n, i) => <option key={i} value={i + 1}>{n}</option>)
                }
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Free Chlorine (ppm)</label>
                <input type="number" className="input" placeholder="2.0" value={cl} onChange={(e) => setCl(e.target.value)} step="0.1" />
              </div>
              <div>
                <label className="label">pH Level</label>
                <input type="number" className="input" placeholder="7.4" value={ph} onChange={(e) => setPh(e.target.value)} step="0.1" />
              </div>
              <div>
                <label className="label">Total Alkalinity</label>
                <input type="number" className="input" placeholder="100" value={ta} onChange={(e) => setTa(e.target.value)} />
              </div>
              <div>
                <label className="label">Water Temp (°F)</label>
                <input type="number" className="input" placeholder="82" value={temp} onChange={(e) => setTemp(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Service Checklist</h2>
            <div className="space-y-2">
              {CHECKS_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key as keyof typeof checks)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    checks[key as keyof typeof checks]
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    checks[key as keyof typeof checks] ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                  }`}>
                    {checks[key as keyof typeof checks] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Issues */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3">Issues Found</h2>
            <input
              className="input"
              placeholder="pH high, algae starting, equipment issue..."
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3">Tech Notes</h2>
            <textarea
              className="input resize-none"
              rows={5}
              placeholder="Chemicals added, observations, customer requests, gate code..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Photos placeholder */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photos
            </h2>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 cursor-pointer hover:border-pool-300 hover:bg-pool-50 transition-colors">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Tap to add photos</p>
              <p className="text-xs mt-1">AI will auto-tag issues</p>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <button onClick={handleSubmit} disabled={isPending} className="btn-primary w-full">
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Send className="w-4 h-4" /> Save Report & Generate PDF</>
              }
            </button>
            <button onClick={onBack} className="btn-outline w-full">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const searchParams = useSearchParams();
  const defaultPool = searchParams.get("pool") ?? undefined;
  const [showNew, setShowNew] = useState(!!defaultPool);

  return showNew
    ? <NewReportForm onBack={() => setShowNew(false)} defaultPoolId={defaultPool} />
    : <ReportList onNew={() => setShowNew(true)} />;
}
