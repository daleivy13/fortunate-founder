"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileText, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePool } from "@/hooks/useData";

interface ParsedPool {
  name:          string;
  clientName:    string;
  clientEmail:   string;
  clientPhone:   string;
  address:       string;
  type:          string;
  volumeGallons: string;
  monthlyRate:   string;
  serviceDay:    string;
  valid:         boolean;
  error?:        string;
}

function parseSkimmerCSV(text: string): ParsedPool[] {
  const lines  = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g,""));
  const pools: ParsedPool[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g,""));
    const row: Record<string,string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? ""; });

    // Map Skimmer column names to PoolPal fields (handles variations)
    const name        = row["pool name"] || row["name"] || row["property name"] || `Pool ${i}`;
    const clientName  = row["client name"] || row["customer name"] || row["owner"] || row["contact"] || "Unknown";
    const clientEmail = row["email"] || row["client email"] || row["customer email"] || "";
    const clientPhone = row["phone"] || row["client phone"] || row["mobile"] || "";
    const address     = row["address"] || row["location"] || row["street"] || "";
    const volume      = row["volume"] || row["gallons"] || row["pool volume"] || "";
    const rate        = row["monthly rate"] || row["rate"] || row["price"] || "";
    const day         = row["service day"] || row["service days"] || row["schedule"] || "";
    const type        = row["type"] || row["pool type"] || "residential";

    const valid = name.length > 0 && address.length > 0;

    pools.push({
      name, clientName, clientEmail, clientPhone, address,
      type: type.toLowerCase().includes("commercial") ? "commercial"
          : type.toLowerCase().includes("hoa")        ? "hoa"
          : "residential",
      volumeGallons: volume.replace(/[^0-9]/g,""),
      monthlyRate:   rate.replace(/[^0-9.]/g,""),
      serviceDay:    day,
      valid,
      error: !valid ? "Missing name or address" : undefined,
    });
  }
  return pools;
}

export default function ImportPage() {
  const { company } = useAuth();
  const { mutateAsync: createPool } = useCreatePool();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,     setStep]     = useState<"upload"|"preview"|"importing"|"done">("upload");
  const [pools,    setPools]    = useState<ParsedPool[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors,   setErrors]   = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text   = ev.target?.result as string;
      const parsed = parseSkimmerCSV(text);
      setPools(parsed);
      setSelected(new Set(parsed.filter((p) => p.valid).map((_, i) => i)));
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!company) return;
    const toImport = pools.filter((_, i) => selected.has(i) && pools[i].valid);
    setProgress({ done: 0, total: toImport.length });
    setStep("importing");
    const errs: string[] = [];

    for (let i = 0; i < toImport.length; i++) {
      const pool = toImport[i];
      try {
        await createPool({
          companyId:     company.id,
          name:          pool.name,
          clientName:    pool.clientName,
          clientEmail:   pool.clientEmail,
          clientPhone:   pool.clientPhone,
          address:       pool.address,
          type:          pool.type,
          volumeGallons: pool.volumeGallons || undefined,
          monthlyRate:   pool.monthlyRate   || undefined,
          serviceDay:    pool.serviceDay    || undefined,
        });
      } catch (err: any) {
        errs.push(`${pool.name}: ${err.message}`);
      }
      setProgress({ done: i + 1, total: toImport.length });
    }
    setErrors(errs);
    setStep("done");
  };

  const toggleAll = () => {
    const validIdxs = pools.map((_, i) => i).filter((i) => pools[i].valid);
    if (selected.size === validIdxs.length) setSelected(new Set());
    else setSelected(new Set(validIdxs));
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import from Skimmer</h1>
        <p className="text-slate-500 text-sm mt-1">
          Export your Skimmer data as CSV, then import all your pools in one click.
        </p>
      </div>

      {/* How to export from Skimmer */}
      <div className="bg-[#e8f1fc] border border-teal-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">How to export from Skimmer:</p>
        <div className="space-y-1">
          {["Open Skimmer → Settings → Data Export", "Select 'Customers' or 'Properties'", "Choose CSV format → Download", "Upload the file below"].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-teal-800">
              <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      </div>

      {step === "upload" && (
        <div
          className="card p-10 text-center border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-[#e8f1fc] transition-all cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Drop your Skimmer CSV here</p>
          <p className="text-sm text-slate-400 mt-1">or click to browse</p>
          <p className="text-xs text-slate-300 mt-3">Supports: Skimmer, ServiceTitan, custom CSV</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>
      )}

      {step === "preview" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{pools.length} pools found in CSV</p>
              <p className="text-sm text-slate-500">{pools.filter((p) => p.valid).length} ready to import · {pools.filter((p) => !p.valid).length} have errors</p>
            </div>
            <button onClick={toggleAll} className="btn-outline text-sm">
              {selected.size === pools.filter((p) => p.valid).length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pools.map((pool, i) => (
              <div
                key={i}
                onClick={() => {
                  if (!pool.valid) return;
                  const s = new Set(selected);
                  s.has(i) ? s.delete(i) : s.add(i);
                  setSelected(s);
                }}
                className={`card p-3 flex items-center gap-3 cursor-pointer ${!pool.valid ? "opacity-50 cursor-not-allowed" : selected.has(i) ? "border-teal-300 bg-[#e8f1fc]" : ""}`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  !pool.valid ? "border-slate-200" : selected.has(i) ? "bg-[#1756a9] border-teal-600" : "border-slate-300"
                }`}>
                  {selected.has(i) && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{pool.name}</p>
                  <p className="text-xs text-slate-400 truncate">{pool.clientName} · {pool.address}</p>
                </div>
                {!pool.valid && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">{pool.error}</span>
                  </div>
                )}
                {pool.valid && pool.monthlyRate && (
                  <span className="text-xs text-slate-400">${pool.monthlyRate}/mo</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="btn-outline">Back</button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="btn-primary flex-1"
            >
              <ArrowRight className="w-4 h-4" />
              Import {selected.size} Pool{selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        </>
      )}

      {step === "importing" && (
        <div className="card p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1756a9] mx-auto mb-4" />
          <p className="font-semibold text-slate-900">Importing pools...</p>
          <p className="text-slate-500 text-sm mt-1">{progress.done} of {progress.total} complete</p>
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0891c4] rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-900">
            {progress.total - errors.length} pools imported successfully!
          </p>
          {errors.length > 0 && (
            <div className="mt-4 text-left bg-red-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800 mb-2">{errors.length} failed:</p>
              {errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
            </div>
          )}
          <a href="/pools" className="btn-primary mt-6 inline-flex">
            View My Pools
          </a>
        </div>
      )}
    </div>
  );
}
