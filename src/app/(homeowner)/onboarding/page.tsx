"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Waves, MapPin, Thermometer, Wrench, Camera, Target,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2,
} from "lucide-react";
import { ZONE_INFO, type ClimateZone } from "@/lib/climate";

const TOTAL_STEPS = 9;

interface Profile {
  firstName:        string;
  lastName:         string;
  email:            string;
  phone:            string;
  address:          string;
  zip:              string;
  state:            string;
  poolType:         string;
  poolShape:        string;
  poolVolumeGallons:string;
  poolAgeYears:     string;
  hasSpa:           boolean;
  hasHeater:        boolean;
  hasSaltwater:     boolean;
  hasRobot:         boolean;
  hasLights:        boolean;
  hasWaterfalls:    boolean;
  serviceFrequency: string;
  currentPro:       string;
  goals:            string[];
}

const INITIAL: Profile = {
  firstName:"", lastName:"", email:"", phone:"",
  address:"", zip:"", state:"",
  poolType:"", poolShape:"",
  poolVolumeGallons:"", poolAgeYears:"",
  hasSpa:false, hasHeater:false, hasSaltwater:false,
  hasRobot:false, hasLights:false, hasWaterfalls:false,
  serviceFrequency:"", currentPro:"", goals:[],
};

const POOL_TYPES   = ["Inground – Concrete/Gunite", "Inground – Fiberglass", "Inground – Vinyl Liner", "Above Ground", "Inflatable / Temporary"];
const POOL_SHAPES  = ["Rectangle", "Oval", "Kidney", "L-Shape", "Freeform / Custom", "Round"];
const SERVICE_FREQ = ["Weekly", "Bi-weekly", "Monthly", "I do it myself", "Not currently serviced"];
const GOAL_OPTIONS = ["Cleaner, clearer water", "Lower chemical costs", "Save time on maintenance", "Understand my equipment better", "Find a reliable pool pro", "Prepare for winter / opening", "Fix a current problem"];

const POOL_VOLUME_TIPS: Record<string, string> = {
  "Inground – Concrete/Gunite":   "Typical inground concrete pools: 15,000–30,000 gal",
  "Inground – Fiberglass":        "Typical fiberglass pools: 10,000–25,000 gal",
  "Inground – Vinyl Liner":       "Typical vinyl liner pools: 12,000–24,000 gal",
  "Above Ground":                 "Typical above ground pools: 3,000–15,000 gal",
  "Inflatable / Temporary":       "Typical inflatable pools: 500–3,000 gal",
};

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-[#1756a9] rounded-full transition-all duration-500"
        style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? "border-[#1756a9] bg-[#e8f1fc]" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${checked ? "bg-[#1756a9]" : "bg-slate-300"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className={`text-sm font-medium ${checked ? "text-[#1756a9]" : "text-slate-700"}`}>{label}</span>
    </label>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [p, setP]             = useState<Profile>(INITIAL);
  const [saving, setSaving]   = useState(false);
  const [climateZone, setClimateZone] = useState<ClimateZone | null>(null);
  const [equipPhoto, setEquipPhoto]   = useState<string | null>(null);
  const [equipResult, setEquipResult] = useState<any>(null);
  const [scanningEquip, setScanningEquip] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof Profile, val: any) => setP(p => ({ ...p, [field]: val }));
  const toggleGoal = (g: string) => setP(p => ({ ...p, goals: p.goals.includes(g) ? p.goals.filter(x => x !== g) : [...p.goals, g] }));

  const save = async (extra?: Partial<Profile>, complete = false) => {
    const merged = { ...p, ...extra };
    setSaving(true);
    const res = await fetch("/api/homeowner/onboarding", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...merged,
        poolVolumeGallons: merged.poolVolumeGallons ? parseInt(merged.poolVolumeGallons) : undefined,
        poolAgeYears:      merged.poolAgeYears      ? parseInt(merged.poolAgeYears)      : undefined,
        onboardingStep:    step,
        onboardingCompleted: complete,
      }),
    });
    const json = await res.json();
    if (json.climateZone) setClimateZone(json.climateZone as ClimateZone);
    setSaving(false);
  };

  const next = async () => {
    await save();
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else { await save({}, true); router.push("/homeowner"); }
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  const handleEquipPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningEquip(true);
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setEquipPhoto(URL.createObjectURL(file));
    try {
      const res = await fetch("/api/equipment/identify-photo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      setEquipResult(await res.json());
    } catch { /* silent */ }
    setScanningEquip(false);
  };

  const zoneInfo = climateZone ? ZONE_INFO[climateZone] : null;

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Waves className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Welcome to PoolPal</h2>
              <p className="text-sm text-slate-500 mt-1">Let's set up your pool profile so we can give you personalized advice.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input className="input w-full" value={p.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Alex" /></div>
              <div><label className="label">Last Name</label><input className="input w-full" value={p.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Johnson" /></div>
            </div>
            <div><label className="label">Email</label><input className="input w-full" type="email" value={p.email} onChange={e => set("email", e.target.value)} placeholder="alex@example.com" /></div>
            <div><label className="label">Phone (optional)</label><input className="input w-full" type="tel" value={p.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 123-4567" /></div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Where is your pool?</h2>
              <p className="text-sm text-slate-500 mt-1">Your location helps us give climate-specific advice.</p>
            </div>
            <div><label className="label">Street Address</label><input className="input w-full" value={p.address} onChange={e => set("address", e.target.value)} placeholder="123 Pool Lane" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">ZIP Code</label><input className="input w-full" value={p.zip} onChange={e => set("zip", e.target.value)} placeholder="90210" maxLength={5} /></div>
              <div><label className="label">State</label><input className="input w-full" value={p.state} onChange={e => set("state", e.target.value)} placeholder="CA" maxLength={2} /></div>
            </div>
            {climateZone && zoneInfo && (
              <div className="bg-[#e8f1fc] border border-[#1756a9]/20 rounded-xl p-3">
                <p className="text-xs font-bold text-[#1756a9] mb-1">🌡 Climate Zone: {zoneInfo.label}</p>
                <p className="text-xs text-slate-600">{zoneInfo.seasonLength}-month swim season · {zoneInfo.algaeRisk} algae risk · {zoneInfo.winterize ? "Winterization required" : "Year-round pool"}</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Waves className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">About your pool</h2>
              <p className="text-sm text-slate-500 mt-1">Pool type affects chemistry and maintenance.</p>
            </div>
            <div>
              <label className="label">Pool Type</label>
              <div className="grid grid-cols-1 gap-2">
                {POOL_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set("poolType", t)}
                    className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${p.poolType === t ? "border-[#1756a9] bg-[#e8f1fc] text-[#1756a9]" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Waves className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Pool size & shape</h2>
            </div>
            <div>
              <label className="label">Shape</label>
              <div className="grid grid-cols-2 gap-2">
                {POOL_SHAPES.map(s => (
                  <button key={s} type="button" onClick={() => set("poolShape", s)}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${p.poolShape === s ? "border-[#1756a9] bg-[#e8f1fc] text-[#1756a9]" : "border-slate-200 text-slate-700"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Approx. Volume (gallons)</label>
                <input className="input w-full" type="number" value={p.poolVolumeGallons} onChange={e => set("poolVolumeGallons", e.target.value)} placeholder="15000" />
                {p.poolType && <p className="text-xs text-slate-400 mt-1">{POOL_VOLUME_TIPS[p.poolType]}</p>}
              </div>
              <div>
                <label className="label">Pool Age (years)</label>
                <input className="input w-full" type="number" value={p.poolAgeYears} onChange={e => set("poolAgeYears", e.target.value)} placeholder="5" />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Wrench className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Pool features</h2>
              <p className="text-sm text-slate-500 mt-1">What extras does your pool have?</p>
            </div>
            <div className="space-y-2">
              <Toggle checked={p.hasSpa}        onChange={v => set("hasSpa", v)}        label="Attached spa / hot tub"  />
              <Toggle checked={p.hasHeater}      onChange={v => set("hasHeater", v)}      label="Pool heater"             />
              <Toggle checked={p.hasSaltwater}   onChange={v => set("hasSaltwater", v)}   label="Salt water / chlorinator" />
              <Toggle checked={p.hasRobot}       onChange={v => set("hasRobot", v)}       label="Robotic cleaner"         />
              <Toggle checked={p.hasLights}      onChange={v => set("hasLights", v)}      label="Underwater lights"       />
              <Toggle checked={p.hasWaterfalls}  onChange={v => set("hasWaterfalls", v)}  label="Waterfall / water feature" />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Camera className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Identify your equipment</h2>
              <p className="text-sm text-slate-500 mt-1">Optional — snap a photo of your pump, filter, or heater for AI identification.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEquipPhoto} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={scanningEquip}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              {scanningEquip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {scanningEquip ? "Identifying…" : "📷 Take Equipment Photo"}
            </button>
            {equipPhoto && (
              <img src={equipPhoto} alt="Equipment" className="w-full rounded-xl border border-slate-200 object-cover max-h-48" />
            )}
            {equipResult && (
              <div className="bg-[#e8f1fc] border border-[#1756a9]/20 rounded-xl p-4">
                <p className="text-sm font-bold text-[#1756a9] mb-1">
                  {equipResult.category} {equipResult.brand ? `· ${equipResult.brand}` : ""} {equipResult.model ? `${equipResult.model}` : ""}
                </p>
                <p className="text-xs text-slate-600">{equipResult.description}</p>
                {equipResult.notes && <p className="text-xs text-amber-700 mt-1">⚠ {equipResult.notes}</p>}
                <p className="text-xs text-slate-400 mt-1">{equipResult.confidence} confidence</p>
              </div>
            )}
            <div>
              <label className="label">Equipment Notes (optional)</label>
              <textarea className="input w-full h-20 resize-none text-sm" value={p.currentPro} onChange={e => set("equipmentNotes" as any, e.target.value)}
                placeholder="Any issues you've noticed, brands, or ages…" />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Wrench className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">Current service setup</h2>
            </div>
            <div>
              <label className="label">How often is your pool serviced?</label>
              <div className="space-y-2">
                {SERVICE_FREQ.map(f => (
                  <button key={f} type="button" onClick={() => set("serviceFrequency", f)}
                    className={`w-full p-3 rounded-xl border text-left text-sm font-medium transition-all ${p.serviceFrequency === f ? "border-[#1756a9] bg-[#e8f1fc] text-[#1756a9]" : "border-slate-200 text-slate-700"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label">Pool company or pro name (optional)</label><input className="input w-full" value={p.currentPro} onChange={e => set("currentPro", e.target.value)} placeholder="Blue Wave Pool Service" /></div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Target className="w-10 h-10 text-[#1756a9] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900">What do you want to achieve?</h2>
              <p className="text-sm text-slate-500 mt-1">Select all that apply — we'll personalize your experience.</p>
            </div>
            <div className="space-y-2">
              {GOAL_OPTIONS.map(g => (
                <button key={g} type="button" onClick={() => toggleGoal(g)}
                  className={`w-full p-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${p.goals.includes(g) ? "border-[#1756a9] bg-[#e8f1fc] text-[#1756a9]" : "border-slate-200 text-slate-700"}`}>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${p.goals.includes(g) ? "border-[#1756a9] bg-[#1756a9]" : "border-slate-300"}`}>
                    {p.goals.includes(g) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </span>
                  {g}
                </button>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">You're all set!</h2>
            <p className="text-slate-500">Your pool profile is complete. Here's a summary:</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
              {p.firstName && <p><span className="text-slate-400">Name:</span> {p.firstName} {p.lastName}</p>}
              {p.poolType  && <p><span className="text-slate-400">Pool:</span> {p.poolType}{p.poolShape ? `, ${p.poolShape}` : ""}</p>}
              {p.poolVolumeGallons && <p><span className="text-slate-400">Volume:</span> {parseInt(p.poolVolumeGallons).toLocaleString()} gal</p>}
              {climateZone && <p><span className="text-slate-400">Climate:</span> {ZONE_INFO[climateZone].label}</p>}
              {p.goals.length > 0 && <p><span className="text-slate-400">Goals:</span> {p.goals.join(", ")}</p>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-start justify-center">
      <div className="w-full max-w-lg">
        <div className="text-xs text-slate-400 text-center mb-2">Step {step} of {TOTAL_STEPS}</div>
        <ProgressBar step={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {stepContent()}
        </div>

        <div className="flex items-center justify-between mt-4">
          {step > 1
            ? <button onClick={back} className="btn-outline flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back</button>
            : <div />}
          <button onClick={next} disabled={saving}
            className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === TOTAL_STEPS ? "Go to Dashboard" : "Continue"}
            {step < TOTAL_STEPS && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
