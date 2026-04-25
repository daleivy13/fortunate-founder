"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Waves, ChevronRight, MapPin, FlaskConical, FileText, DollarSign, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STEPS = [
  { id:"company",   icon:Waves,        title:"Set up your company",          desc:"Tell us about your pool service business",          color:"blue"    },
  { id:"pool",      icon:MapPin,       title:"Add your first pool",           desc:"Start with one — add the rest after setup",         color:"teal"    },
  { id:"chemistry", icon:FlaskConical, title:"Try AI chemistry",              desc:"See real-time dosage calculations as you type",     color:"violet"  },
  { id:"invoicing", icon:DollarSign,   title:"Configure invoicing",           desc:"We auto-generate and send invoices for you",        color:"emerald" },
  { id:"done",      icon:CheckCircle2, title:"You're all set!",               desc:"Your pool business is ready to run on PoolPal AI",  color:"blue"    },
];

const FIELDS: Record<string, {key:string;label:string;placeholder:string;type:string}[]> = {
  company:   [
    {key:"companyName",label:"Company Name",placeholder:"Sunbelt Pool Services",type:"text"},
    {key:"phone",label:"Business Phone",placeholder:"(480) 555-0000",type:"tel"},
    {key:"poolCount",label:"Pools you service",placeholder:"25",type:"number"},
  ],
  pool:      [
    {key:"poolName",label:"Client / Pool Name",placeholder:"Johnson Residence",type:"text"},
    {key:"poolAddr",label:"Pool Address",placeholder:"1420 Maple Dr, Scottsdale, AZ",type:"text"},
    {key:"poolVol",label:"Pool Volume (gallons)",placeholder:"15000",type:"number"},
  ],
  chemistry: [
    {key:"cl",label:"Free Chlorine (ppm)",placeholder:"2.0",type:"number"},
    {key:"ph",label:"pH Level",placeholder:"7.4",type:"number"},
    {key:"ta",label:"Total Alkalinity (ppm)",placeholder:"100",type:"number"},
  ],
  invoicing: [
    {key:"rate",label:"Monthly Rate ($/pool)",placeholder:"150",type:"number"},
    {key:"billEmail",label:"Your Billing Email",placeholder:"you@company.com",type:"email"},
  ],
};

const COLOR_MAP: Record<string,string> = {
  blue:"bg-[#1756a9]", teal:"bg-[#1756a9]", violet:"bg-violet-600", emerald:"bg-emerald-600",
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [step,   setStep]   = useState(0);
  const [vals,   setVals]   = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [tip,    setTip]    = useState("");

  const cur    = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const pct    = Math.round((step / (STEPS.length - 1)) * 100);
  const fields = FIELDS[cur.id] ?? [];
  const set    = (k: string, v: string) => setVals(p => ({...p,[k]:v}));

  const chemTip = () => {
    const cl = parseFloat(vals.cl)||0, ph = parseFloat(vals.ph)||0;
    if (!cl && !ph) return;
    const t = [];
    if (cl < 1) t.push(`🔴 Chlorine critically low (${cl} ppm) — add shock`);
    else if (cl < 2) t.push(`🟡 Boost Cl from ${cl} to 3 ppm`);
    else t.push(`✅ Chlorine ${cl} ppm — perfect`);
    if (ph > 7.6) t.push(`🟡 pH ${ph} high — add muriatic acid`);
    else if (ph < 7.2) t.push(`🟡 pH ${ph} low — add soda ash`);
    else t.push(`✅ pH ${ph} — balanced`);
    setTip(t.join(" · "));
  };

  const next = async () => {
    if (isLast) { router.push("/dashboard"); return; }
    setSaving(true);
    try {
      if (cur.id === "company") {
        const res = await fetch("/api/companies", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ companyName:vals.companyName, phone:vals.phone, ownerId:user?.uid, email:user?.email }),
        });
        const d = await res.json();
        if (d.company?.id) set("companyId", String(d.company.id));
      }
      if (cur.id === "pool" && vals.poolName && vals.poolAddr && vals.companyId) {
        await fetch("/api/pools", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            companyId:     parseInt(vals.companyId),
            name:          vals.poolName,
            clientName:    vals.poolName,
            address:       vals.poolAddr,
            volumeGallons: vals.poolVol ? parseInt(vals.poolVol) : 15000,
            type:          "residential",
          }),
        });
      }
      if (cur.id === "chemistry") chemTip();
    } catch {}
    setSaving(false);
    setStep(s => s+1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl overflow-hidden"><img src="/logo.png" alt="PoolPal AI" className="w-full h-full object-cover" /></div>
        <span className="font-bold text-slate-900">PoolPal AI</span>
        <div className="flex-1 mx-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0891c4] rounded-full transition-all duration-500" style={{width:`${pct}%`}}/>
        </div>
        <span className="text-xs text-slate-400">Step {step+1}/{STEPS.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className={`w-16 h-16 rounded-2xl ${COLOR_MAP[cur.color]} flex items-center justify-center mb-6 mx-auto`}>
            <cur.icon className="w-8 h-8 text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">{cur.title}</h1>
          <p className="text-slate-500 text-center mb-8">{cur.desc}</p>

          {fields.length > 0 && (
            <div className="card p-6 space-y-4 mb-6">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input type={f.type} className="input" placeholder={f.placeholder} value={vals[f.key]??""} onChange={e=>set(f.key,e.target.value)} onBlur={()=>cur.id==="chemistry"&&chemTip()}/>
                </div>
              ))}
              {cur.id==="chemistry" && tip && (
                <div className="bg-[#e8f1fc] border border-teal-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-[#1756a9] mb-1">AI Recommendation</p>
                  <p className="text-sm text-teal-800">{tip}</p>
                </div>
              )}
            </div>
          )}

          {isLast && (
            <div className="space-y-2 mb-6">
              {["Company profile created","First pool added","AI chemistry configured","Invoicing set up"].map(item=>(
                <div key={item} className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
                  <span className="text-sm font-semibold text-emerald-800">{item}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={next} disabled={saving} className="btn-primary w-full py-4 text-base">
            {saving?"Saving...":(isLast?"Go to Dashboard →":(<>Next <ChevronRight className="w-4 h-4"/></>))}
          </button>

          {step>0&&!isLast&&(
            <button onClick={()=>setStep(s=>s-1)} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-3 py-2">← Back</button>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {STEPS.map((_,i)=>(<div key={i} className={`h-1.5 rounded-full transition-all ${i===step?"w-6 bg-[#0891c4]":i<step?"w-3 bg-blue-300":"w-3 bg-slate-200"}`}/>))}
          </div>
        </div>
      </div>
    </div>
  );
}
