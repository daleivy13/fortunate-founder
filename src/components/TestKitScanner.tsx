"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";

export interface ScanReadings {
  freeChlorine:     number | null;
  combinedChlorine: number | null;
  bromine:          number | null;
  ph:               number | null;
  totalAlkalinity:  number | null;
  calciumHardness:  number | null;
  cyanuricAcid:     number | null;
  salt:             number | null;
  waterTemp:        number | null;
}

interface ScanResult {
  readings:        ScanReadings;
  flags:           { param: string; value: number; status: "low" | "high"; unit: string }[];
  confidence:      "high" | "medium" | "low";
  detectedKitType: string;
  warnings:        string[];
}

interface Props {
  poolId?:      number;
  saveReading?: boolean;
  onReadings:   (result: ScanResult) => void;
  className?:   string;
  compact?:     boolean;
}

const KIT_TYPE_LABEL: Record<string, string> = {
  strips:  "Test strips",
  liquid:  "Liquid test kit",
  digital: "Digital meter",
  sheet:   "Printed report",
  unknown: "Test kit",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-red-700 bg-red-50 border-red-200",
};

const PARAM_LABELS: Record<string, string> = {
  freeChlorine:     "Free Cl",
  combinedChlorine: "Combined Cl",
  bromine:          "Bromine",
  ph:               "pH",
  totalAlkalinity:  "Alkalinity",
  calciumHardness:  "Calcium",
  cyanuricAcid:     "CYA",
  salt:             "Salt",
  waterTemp:        "Temp",
};

export function TestKitScanner({ poolId, saveReading = false, onReadings, className = "", compact = false }: Props) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [scanning, setScanning]     = useState(false);
  const [preview,  setPreview]      = useState<string | null>(null);
  const [result,   setResult]       = useState<ScanResult | null>(null);
  const [scanErr,  setScanErr]      = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanErr(null);
    setResult(null);
    setScanning(true);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/chemistry/read-photo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageBase64: base64, kitType: "auto", poolId, saveReading }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setScanErr(json.error ?? "Scan failed — please try again.");
        setScanning(false);
        return;
      }

      const sr: ScanResult = {
        readings:        json.readings,
        flags:           json.flags ?? [],
        confidence:      json.confidence ?? "medium",
        detectedKitType: json.detectedKitType ?? "unknown",
        warnings:        json.warnings ?? [],
      };
      setResult(sr);
      onReadings(sr);
    } catch {
      setScanErr("Network error — check your connection.");
    }

    setScanning(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const clearResult = () => {
    setResult(null);
    setPreview(null);
    setScanErr(null);
  };

  const detectedValues = result
    ? (Object.entries(result.readings) as [string, number | null][]).filter(([, v]) => v !== null)
    : [];

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* Trigger button */}
      {!result && (
        <button
          type="button"
          onClick={() => { setScanErr(null); fileRef.current?.click(); }}
          disabled={scanning}
          className={`flex items-center gap-2 ${compact ? "btn-outline text-xs py-2 px-3" : "btn-secondary text-sm"}`}
        >
          {scanning
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Camera className="w-4 h-4" />}
          {scanning ? "AI Reading…" : "📷 Scan Test Kit"}
        </button>
      )}

      {/* Scanning state with preview */}
      {scanning && preview && (
        <div className="card p-4 flex items-center gap-4">
          <img src={preview} alt="Scanning" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#1756a9]" />
              <p className="text-sm font-semibold text-slate-800">Claude AI is reading your test kit…</p>
            </div>
            <p className="text-xs text-slate-400">Analyzing color pads and values</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {scanErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{scanErr}</p>
          </div>
          <button onClick={clearResult} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result card */}
      {result && !scanning && (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${CONFIDENCE_COLOR[result.confidence]}`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">
                Detected {detectedValues.length} value{detectedValues.length !== 1 ? "s" : ""}
                {" "}· {KIT_TYPE_LABEL[result.detectedKitType] ?? result.detectedKitType}
                {" "}· <span className="capitalize">{result.confidence}</span> confidence
              </p>
              <p className="text-xs mt-0.5 opacity-75">Values auto-filled — please verify before treating</p>
            </div>
            {preview && (
              <img src={preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/50" />
            )}
            <button onClick={clearResult} className="p-1 hover:bg-black/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detected readings grid */}
          {detectedValues.length > 0 && (
            <div className="px-4 py-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {detectedValues.map(([key, val]) => {
                const flag = result.flags.find(f => f.param === key);
                return (
                  <div key={key} className={`rounded-lg p-2 text-center text-xs ${flag ? (flag.status === "high" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200") : "bg-slate-50 border border-slate-200"}`}>
                    <p className={`font-bold text-sm ${flag ? (flag.status === "high" ? "text-red-700" : "text-amber-700") : "text-slate-800"}`}>
                      {val}
                    </p>
                    <p className={`mt-0.5 ${flag ? (flag.status === "high" ? "text-red-500" : "text-amber-500") : "text-slate-400"}`}>
                      {PARAM_LABELS[key] ?? key}
                      {flag && <span className="ml-1">{flag.status === "high" ? "↑" : "↓"}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="px-4 pb-3">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Rescan button */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => { clearResult(); setTimeout(() => fileRef.current?.click(), 50); }}
              className="btn-outline text-xs py-1.5"
            >
              <Camera className="w-3 h-3" /> Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
