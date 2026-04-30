"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Camera, Loader2, ChevronRight, ChevronLeft, Shield } from "lucide-react";

const CHECKLIST = [
  { id: "pump_running",    label: "Pump running smoothly",            detail: "Listen for unusual noises — grinding or rattling indicates bearing wear" },
  { id: "filter_pressure", label: "Filter pressure in normal range",  detail: "Note your baseline PSI. Backwash if pressure is 8–10 PSI above baseline" },
  { id: "water_level",     label: "Water level at midpoint of skimmer",detail: "Too low starves the pump; too high reduces skimmer efficiency" },
  { id: "skimmer_basket",  label: "Skimmer basket clean",             detail: "A clogged basket cuts flow to the pump" },
  { id: "pump_basket",     label: "Pump basket clean",                detail: "Check weekly or more often during heavy debris periods" },
  { id: "no_leaks",        label: "No visible leaks around equipment", detail: "Check unions, pump lid, and valve handles for drips" },
  { id: "water_clear",     label: "Water is clear and not tinted",    detail: "Green = algae, cloudy = chemistry imbalance, brown = metals/algae" },
  { id: "no_algae",        label: "No algae on walls or floor",       detail: "Run your hand or a brush along the walls — algae feels slippery" },
  { id: "lights_ok",       label: "Lights working (if applicable)",   detail: "Test GFCI breaker monthly — pool lights must be GFCI protected" },
  { id: "heater_ok",       label: "Heater no error codes (if applicable)", detail: "Record any error codes for your service tech" },
];

type Answers = Record<string, "yes" | "no" | "na">;

export default function MonthlyInspectionPage() {
  const [step,     setStep]     = useState<"checklist" | "photo" | "done">("checklist");
  const [answers,  setAnswers]  = useState<Answers>({});
  const [photo,    setPhoto]    = useState<string | null>(null);
  const [uploading,setUploading]= useState(false);
  const [issues,   setIssues]   = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const answered = Object.keys(answers).length;
  const noCount  = Object.values(answers).filter(v => v === "no").length;

  const toggleAnswer = (id: string, val: "yes" | "no" | "na") => {
    setAnswers(p => ({ ...p, [id]: val }));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  };

  const submit = async () => {
    setUploading(true);
    const failing = CHECKLIST.filter(c => answers[c.id] === "no").map(c => c.label);
    setIssues(failing);
    // In production: POST to /api/homeowner/inspection with answers + photo
    await new Promise(r => setTimeout(r, 1000));
    setUploading(false);
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Inspection Complete</h2>
          <p className="text-slate-500 text-sm">{answered} items checked · {noCount} issue{noCount !== 1 ? "s" : ""} flagged</p>
          {issues.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
              <p className="text-sm font-bold text-amber-800 mb-2">Issues to follow up on:</p>
              <ul className="space-y-1">
                {issues.map((iss, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    {iss}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-sm text-emerald-700">All items passed! Your pool is in great shape. 🎉</p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <a href="/diagnostic">
              <button className="btn-outline text-sm">Run Diagnostic</button>
            </a>
            <button onClick={() => { setStep("checklist"); setAnswers({}); setPhoto(null); }} className="btn-primary text-sm">
              Start New Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "photo") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add an Overview Photo</h2>
            <p className="text-sm text-slate-500 mt-1">Optional — helps track your pool's condition over time.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />Take Photo
          </button>
          {photo && <img src={photo} alt="Pool" className="w-full rounded-2xl border border-slate-200 max-h-64 object-cover" />}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep("checklist")} className="btn-outline flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />Back
            </button>
            <button onClick={submit} disabled={uploading} className="btn-primary flex items-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {uploading ? "Submitting…" : "Submit Inspection"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[#1756a9]" />
            <h1 className="text-xl font-bold text-slate-900">Monthly Inspection</h1>
          </div>
          <p className="text-sm text-slate-500">Walk through your equipment and answer each item honestly.</p>
          <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#1756a9] rounded-full transition-all" style={{ width: `${(answered / CHECKLIST.length) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{answered} of {CHECKLIST.length} answered</p>
        </div>

        <div className="space-y-2">
          {CHECKLIST.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border p-4 transition-all ${answers[item.id] ? "border-slate-200" : "border-slate-100"}`}>
              <p className="text-sm font-semibold text-slate-800 mb-1">{item.label}</p>
              <p className="text-xs text-slate-400 mb-3">{item.detail}</p>
              <div className="flex gap-2">
                {(["yes", "no", "na"] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => toggleAnswer(item.id, val)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      answers[item.id] === val
                        ? val === "yes" ? "bg-emerald-500 border-emerald-500 text-white"
                        : val === "no"  ? "bg-red-500 border-red-500 text-white"
                        :                 "bg-slate-400 border-slate-400 text-white"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {val === "yes" ? "✓ Yes" : val === "no" ? "✗ No" : "N/A"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("photo")}
          disabled={answered < CHECKLIST.length}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Continue to Photo
          <ChevronRight className="w-4 h-4" />
        </button>
        {answered < CHECKLIST.length && (
          <p className="text-center text-xs text-slate-400">{CHECKLIST.length - answered} items remaining</p>
        )}
      </div>
    </div>
  );
}
