"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Plus, CheckCircle2, Send, Download, Camera, Loader2, ArrowLeft, X, WifiOff, Star } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { NumberStepper } from "@/components/NumberStepper";
import { useReports, useCreateReport, usePools } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { enqueue } from "@/lib/offlineQueue";

const CHECKS_LABELS = [
  { key: "skimmed",          label: "Skimmed" },
  { key: "brushed",          label: "Brushed walls & floor" },
  { key: "vacuumed",         label: "Vacuumed" },
  { key: "filterCleaned",    label: "Filter cleaned/inspected" },
  { key: "chemicalsAdded",   label: "Chemicals added" },
  { key: "equipmentChecked", label: "Equipment checked" },
];

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  sent:     { label: "PDF Sent",    cls: "badge-green" },
  complete: { label: "Complete",    cls: "badge-blue"  },
  pending:  { label: "In Progress", cls: "badge-amber" },
};

// ─── Report List ──────────────────────────────────────────────────────────────
function ReportList({ onNew }: { onNew: () => void }) {
  const [filter,       setFilter]      = useState<"all" | "pending" | "sent">("all");
  const [sending,      setSending]     = useState<number | null>(null);
  const [ratingSending, setRatingSending] = useState<number | null>(null);
  const [ratingsSent,  setRatingsSent] = useState<Set<number>>(new Set());
  const { company } = useAuth();
  const { data, isLoading, refetch } = useReports();

  const requestRating = async (r: any, pool: any) => {
    setRatingSending(r.id);
    try {
      const token = btoa(`${r.id}:${r.poolId}:${company?.id}:${encodeURIComponent(company?.name ?? "")}:${encodeURIComponent(pool?.name ?? "")}`);
      const ratingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rate?token=${token}`;
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: pool.clientPhone,
          message: `Hi! How was your pool service today? Leave us a quick rating: ${ratingUrl}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "SMS failed");
      setRatingsSent(prev => new Set(prev).add(r.id));
    } catch (e: any) {
      alert(e.message ?? "Failed to send rating request");
    } finally {
      setRatingSending(null);
    }
  };

  const sendToClient = async (reportId: number) => {
    setSending(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Send failed");
      else { await refetch(); }
    } catch { alert("Send failed"); }
    finally { setSending(null); }
  };

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
            {isLoading ? "Loading..." : `${reports.length} report${reports.length !== 1 ? "s" : ""}`}
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
          const r    = item.report ?? item;
          const pool = item.pool;
          const s    = STATUS_DISPLAY[r.status] ?? STATUS_DISPLAY.complete;
          const date = r.servicedAt
            ? new Date(r.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
            : "—";
          const photos: string[] = r.photos ? JSON.parse(r.photos) : [];

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

              {photos.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    </a>
                  ))}
                </div>
              )}

              {r.techNotes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{r.techNotes}</p>
              )}
              {r.issuesFound && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">⚠ {r.issuesFound}</p>
              )}

              {(r.status !== "sent" && pool?.clientEmail) || pool?.clientPhone ? (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  {r.status !== "sent" && pool?.clientEmail && (
                    <button
                      onClick={() => sendToClient(r.id)}
                      disabled={sending === r.id}
                      className="btn-secondary text-xs py-1.5 px-3 w-full"
                    >
                      {sending === r.id
                        ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        : <><Send className="w-3 h-3" /> Email Report to {pool.clientName}</>
                      }
                    </button>
                  )}
                  {pool?.clientPhone && (r.status === "sent" || r.status === "complete") && (
                    <button
                      onClick={() => requestRating(r, pool)}
                      disabled={ratingSending === r.id || ratingsSent.has(r.id)}
                      className="btn-outline text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {ratingSending === r.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : ratingsSent.has(r.id)
                          ? <><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Rating Requested</>
                          : <><Star className="w-3 h-3" /> Request Rating</>
                      }
                    </button>
                  )}
                </div>
              ) : null}
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

  const [poolId,   setPoolId]  = useState(defaultPoolId ?? "");
  const [checks,   setChecks]  = useState({
    skimmed: false, brushed: false, vacuumed: false,
    filterCleaned: false, chemicalsAdded: false, equipmentChecked: false,
  });
  const [cl,      setCl]      = useState("");
  const [ph,      setPh]      = useState("");
  const [ta,      setTa]      = useState("");
  const [temp,    setTemp]    = useState("");
  const [issues,  setIssues]  = useState("");
  const [notes,   setNotes]   = useState("");
  const [dosages, setDosages] = useState<{ chemical: string; amount: string; unit: string }[]>([]);
  const [photos,  setPhotos]  = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [queued,  setQueued]  = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const [error,   setError]   = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (k: keyof typeof checks) =>
    setChecks((c) => ({ ...c, [k]: !c[k] }));

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("poolId", poolId || "0");
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const { url } = await res.json();
          return url as string;
        })
      );
      setPhotos((p) => [...p, ...urls]);
    } catch (err: any) {
      setError(err.message ?? "Photo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) =>
    setPhotos((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!poolId) { setError("Please select a pool"); return; }
    setError("");

    const chemicalsUsedStr = dosages
      .filter(d => d.chemical && d.amount)
      .map(d => `${d.amount}${d.unit} ${d.chemical}`)
      .join(", ");

    const payload = {
      poolId,
      freeChlorine:    cl    || null,
      ph:              ph    || null,
      totalAlkalinity: ta    || null,
      waterTemp:       temp  || null,
      ...checks,
      chemicalsAdded:  dosages.some(d => d.chemical && d.amount) ? true : checks.chemicalsAdded,
      chemicalsUsed:   chemicalsUsedStr || null,
      issuesFound:     issues || null,
      techNotes:       notes  || null,
      photos:          photos.length > 0 ? photos : null,
    };

    if (!navigator.onLine) {
      await enqueue({
        url: "/api/reports",
        method: "POST",
        body: JSON.stringify(payload),
        label: `Service report for pool #${poolId}`,
      });
      setQueued(true);
      return;
    }

    try {
      const res = await createReport(payload);
      setReportId(res.report.id);
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to save report");
    }
  };

  if (queued) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Saved Offline</h2>
        <p className="text-slate-500 text-sm text-center max-w-xs">Report queued locally. It will automatically sync when you reconnect to the internet.</p>
        <button onClick={onBack} className="btn-outline">Back to Reports</button>
      </div>
    );
  }

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
                {pools.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-5 pt-1">
              <NumberStepper label="Free Chlorine" unit="ppm" value={cl}   onChange={setCl}   step={0.1} min={0} max={20}  decimals={1} size="sm" />
              <NumberStepper label="pH Level"               value={ph}   onChange={setPh}   step={0.1} min={6} max={9}   decimals={1} size="sm" />
              <NumberStepper label="Total Alkalinity" unit="ppm" value={ta}  onChange={setTa}   step={5}   min={0} max={400} decimals={0} size="sm" />
              <NumberStepper label="Water Temp" unit="°F"   value={temp} onChange={setTemp} step={1}   min={40} max={115} decimals={0} size="sm" />
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
                  className={`w-full flex items-center gap-3 px-4 rounded-2xl border-2 text-sm font-semibold transition-all text-left touch-manipulation select-none ${
                    checks[key as keyof typeof checks]
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 active:bg-slate-50"
                  }`}
                  style={{ minHeight: 52 }}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
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
            <div className="flex gap-2 items-start">
              <textarea
                className="input flex-1 resize-none"
                rows={2}
                placeholder="pH high, algae starting, equipment issue..."
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                style={{ fontSize: 16 }}
              />
              <VoiceButton onResult={text => setIssues(p => p ? `${p} ${text}` : text)} className="mt-0.5" />
            </div>
          </div>

          {/* Chemical Dosage Log */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Chemicals Added</h2>
              <button
                type="button"
                onClick={() => setDosages(d => [...d, { chemical: "", amount: "", unit: "fl oz" }])}
                className="text-xs text-pool-600 hover:underline font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {dosages.length === 0 ? (
              <p className="text-sm text-slate-400">No chemicals logged yet — tap Add to record what was added.</p>
            ) : (
              <div className="space-y-2">
                {dosages.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Chemical name"
                      value={d.chemical}
                      onChange={e => setDosages(prev => prev.map((x, j) => j === i ? { ...x, chemical: e.target.value } : x))}
                    />
                    <input
                      type="number"
                      className="input w-20 text-sm"
                      placeholder="Qty"
                      value={d.amount}
                      onChange={e => setDosages(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                    />
                    <select
                      className="input w-20 text-sm"
                      value={d.unit}
                      onChange={e => setDosages(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                    >
                      <option>fl oz</option>
                      <option>lbs</option>
                      <option>gal</option>
                      <option>tabs</option>
                      <option>cups</option>
                    </select>
                    <button
                      onClick={() => setDosages(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-300 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">This logs exact amounts for client reports, inventory depletion, and profitability tracking.</p>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3">
              Tech Notes <span className="text-slate-400 font-normal text-sm">— tap mic to speak</span>
            </h2>
            <div className="flex gap-2 items-start">
              <textarea
                className="input flex-1 resize-none"
                rows={4}
                placeholder="Observations, equipment issues, customer requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ fontSize: 16 }}
              />
              <VoiceButton onResult={text => setNotes(p => p ? `${p} ${text}` : text)} className="mt-0.5" />
            </div>
          </div>

          {/* Photos */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photos
            </h2>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 hover:border-pool-300 hover:bg-pool-50 transition-colors"
            >
              {uploading
                ? <><Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin" /><p className="text-sm">Uploading...</p></>
                : <><Camera className="w-6 h-6 mx-auto mb-1 opacity-40" /><p className="text-sm font-medium">Tap to add photos</p><p className="text-xs mt-0.5">JPEG, PNG, WebP, HEIC · max 10MB each</p></>
              }
            </button>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <button onClick={handleSubmit} disabled={isPending || uploading} className="btn-primary w-full">
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
  const defaultPool  = searchParams.get("pool") ?? undefined;
  const [showNew, setShowNew] = useState(!!defaultPool);

  return showNew
    ? <NewReportForm onBack={() => setShowNew(false)} defaultPoolId={defaultPool} />
    : <ReportList onNew={() => setShowNew(true)} />;
}
