"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { NumberStepper } from "./NumberStepper";
import { VoiceButton } from "./VoiceButton";
import { enqueue } from "@/lib/offlineQueue";

const CHECKS = [
  { key: "skimmed",          label: "Skimmed",                    icon: "🧹" },
  { key: "brushed",          label: "Brushed walls & floor",      icon: "🖌️"  },
  { key: "vacuumed",         label: "Vacuumed",                   icon: "⚡" },
  { key: "filterCleaned",    label: "Filter cleaned / inspected", icon: "🔧" },
  { key: "chemicalsAdded",   label: "Chemicals added",            icon: "🧪" },
  { key: "equipmentChecked", label: "Equipment checked",          icon: "✅" },
];

interface Stop {
  pool: { id: number; name: string; clientName?: string };
}

interface Props {
  stop: Stop;
  onComplete: () => void;
  onCancel: () => void;
}

export function StopCompletionModal({ stop, onComplete, onCancel }: Props) {
  const [checks, setChecks] = useState({
    skimmed: false, brushed: false, vacuumed: false,
    filterCleaned: false, chemicalsAdded: false, equipmentChecked: false,
  });
  const [cl,     setCl]     = useState("");
  const [ph,     setPh]     = useState("");
  const [ta,     setTa]     = useState("");
  const [temp,   setTemp]   = useState("");
  const [issues, setIssues] = useState("");
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toggle = (k: keyof typeof checks) =>
    setChecks(c => ({ ...c, [k]: !c[k] }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      poolId:          String(stop.pool.id),
      freeChlorine:    cl   || null,
      ph:              ph   || null,
      totalAlkalinity: ta   || null,
      waterTemp:       temp || null,
      ...checks,
      chemicalsAdded: checks.chemicalsAdded,
      issuesFound:    issues || null,
      techNotes:      notes  || null,
      photos:         null,
    };

    if (!navigator.onLine) {
      await enqueue({
        url: "/api/reports",
        method: "POST",
        body: JSON.stringify(payload),
        label: `Service report — ${stop.pool.name}`,
      });
      setSaving(false);
      onComplete();
      return;
    }

    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* stop completes even if report save fails */ }
    finally {
      setSaving(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0 bg-white">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Completing stop</p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{stop.pool.name}</h2>
          {stop.pool.clientName && (
            <p className="text-sm text-slate-500">{stop.pool.clientName}</p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

        {/* Checklist — 60px tall tap targets */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Service Checklist</p>
          <div className="space-y-2">
            {CHECKS.map(({ key, label, icon }) => {
              const checked = checks[key as keyof typeof checks];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key as keyof typeof checks)}
                  className={`w-full flex items-center gap-4 px-4 rounded-2xl border-2 transition-all touch-manipulation select-none ${
                    checked
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 active:bg-slate-50"
                  }`}
                  style={{ minHeight: 60 }}
                >
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <span className="text-base font-semibold flex-1 text-left">{label}</span>
                  <div
                    className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checked ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                    }`}
                  >
                    {checked && <span className="text-white text-sm font-bold">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chemistry steppers */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-5">Chemistry Readings</p>
          <div className="grid grid-cols-2 gap-6">
            <NumberStepper label="Free Chlorine" unit="ppm"  value={cl}   onChange={setCl}   step={0.1} min={0} max={20}  decimals={1} size="lg" />
            <NumberStepper label="pH Level"                  value={ph}   onChange={setPh}   step={0.1} min={6} max={9}   decimals={1} size="lg" />
            <NumberStepper label="Total Alkalinity" unit="ppm" value={ta} onChange={setTa}   step={5}   min={0} max={400} decimals={0} size="lg" />
            <NumberStepper label="Water Temp" unit="°F"      value={temp} onChange={setTemp} step={1}   min={40} max={115} decimals={0} size="lg" />
          </div>
        </div>

        {/* Issues — voice input */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Issues Found</p>
          <div className="flex gap-2 items-start">
            <textarea
              className="input flex-1 resize-none"
              rows={2}
              placeholder="Any issues with the pool or equipment..."
              value={issues}
              onChange={e => setIssues(e.target.value)}
              style={{ fontSize: 16 }}
            />
            <VoiceButton
              onResult={text => setIssues(p => p ? `${p} ${text}` : text)}
              className="mt-0.5"
            />
          </div>
        </div>

        {/* Tech Notes — voice input */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
            Tech Notes <span className="text-slate-300 font-normal normal-case tracking-normal">— tap mic to speak</span>
          </p>
          <div className="flex gap-2 items-start">
            <textarea
              className="input flex-1 resize-none"
              rows={3}
              placeholder="Customer requests, observations, next visit notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ fontSize: 16 }}
            />
            <VoiceButton
              onResult={text => setNotes(p => p ? `${p} ${text}` : text)}
              className="mt-0.5"
            />
          </div>
        </div>

        {/* Bottom padding to clear fixed button */}
        <div className="h-2" />
      </div>

      {/* Fixed submit bar */}
      <div className="flex-shrink-0 px-5 pt-3 pb-6 border-t border-slate-100 bg-white space-y-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all touch-manipulation select-none disabled:opacity-60"
          style={{ minHeight: 64, fontSize: 18 }}
        >
          {saving
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <><CheckCircle2 className="w-6 h-6" /> Complete Stop &amp; Save Report</>
          }
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-400 font-medium text-sm touch-manipulation"
        >
          Cancel — back to route
        </button>
      </div>
    </div>
  );
}
