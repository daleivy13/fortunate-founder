"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface Dosage { chemical: string; flOz: number | null; lbs: number | null; reason: string; urgency: "critical"|"high"|"normal"; }
const URGENCY_COLOR = { critical:"bg-red-50 border-red-300 text-red-800", high:"bg-amber-50 border-amber-300 text-amber-800", normal:"bg-emerald-50 border-emerald-300 text-emerald-800" };

function calcDosages(vals: Record<string,string>): Dosage[] {
  const cl=parseFloat(vals.freeChlorine)||0, ph=parseFloat(vals.ph)||7.4;
  const ta=parseFloat(vals.totalAlkalinity)||100, vol=parseFloat(vals.volumeGallons)||15000;
  const f=vol/10000; const out:Dosage[]=[];
  if(cl<1.0){const oz=Math.round((2.0-cl)*8*f*10)/10;out.push({chemical:"Liquid Chlorine (10%)",flOz:oz,lbs:null,reason:`Cl ${cl} ppm → target 2–4`,urgency:cl<0.5?"critical":"high"});}
  if(ph>7.6){const oz=Math.round((ph-7.4)*20*f*10)/10;out.push({chemical:"Muriatic Acid",flOz:oz,lbs:null,reason:`pH ${ph} → target 7.2–7.6`,urgency:ph>8.0?"high":"normal"});}
  else if(ph<7.2){const oz=Math.round((7.4-ph)*15*f*10)/10;out.push({chemical:"Soda Ash (pH Up)",flOz:oz,lbs:null,reason:`pH ${ph} → target 7.2–7.6`,urgency:"normal"});}
  if(ta<80){const lb=Math.round((90-ta)*vol*0.0000017*10)/10;out.push({chemical:"Sodium Bicarbonate",flOz:null,lbs:lb,reason:`TA ${ta} ppm → target 80–120`,urgency:"normal"});}
  if(out.length===0)out.push({chemical:"balanced",flOz:null,lbs:null,reason:"All parameters within ideal range.",urgency:"normal"});
  return out;
}

export default function ChemistryPage() {
  const { t, units, displaySmallDose, displayLargeDose, config } = useI18n();
  const [vals,setVals]=useState({freeChlorine:"0.8",ph:"8.4",totalAlkalinity:"120",calciumHardness:"200",cyanuricAcid:"40",waterTemp:config.unitSystem==="metric"?"28":"82",volumeGallons:config.unitSystem==="metric"?"56000":"15000"});
  const [aiAnalysis,setAiAnalysis]=useState("");
  const [isPending,startTransition]=useTransition();
  const dosages=calcDosages(vals);

  const FIELDS=[
    {key:"freeChlorine",label:t("chemistry.freeChlorine"),unit:"ppm",target:"2.0–4.0",step:"0.1"},
    {key:"ph",label:t("chemistry.ph"),unit:"",target:"7.2–7.6",step:"0.1"},
    {key:"totalAlkalinity",label:t("chemistry.alkalinity"),unit:"ppm",target:"80–120",step:"1"},
    {key:"calciumHardness",label:t("chemistry.calciumHardness"),unit:"ppm",target:"150–400",step:"1"},
    {key:"cyanuricAcid",label:t("chemistry.cyanuricAcid"),unit:"ppm",target:"30–80",step:"1"},
    {key:"waterTemp",label:t("chemistry.temp"),unit:units.temp.abbr,target:"",step:"1"},
    {key:"volumeGallons",label:t("chemistry.poolVolume"),unit:units.volume.abbr,target:"",step:"500"},
  ];

  const getAI=async()=>{startTransition(async()=>{if(!navigator.onLine){setAiAnalysis("You're offline — AI analysis requires an internet connection. The dosage calculator above works offline.");return;}try{const res=await fetch("/api/chemistry/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...vals,locale:config.locale,unitSystem:config.unitSystem})});const data=await res.json();setAiAnalysis(data.analysis);}catch{setAiAnalysis("Add ANTHROPIC_API_KEY to .env.local to enable AI.");}});};

  const formatDose=(d:Dosage)=>d.flOz!==null?displaySmallDose(d.flOz):d.lbs!==null?displayLargeDose(d.lbs):"—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-[#1756a9]" />{t("chemistry.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("chemistry.subtitle")}</p>
        <p className="text-xs text-[#1756a9] mt-1 font-medium">
          {config.flag} {config.nameEn} · {config.unitSystem==="metric"?"Metric (mL, L, g)":"Imperial (fl oz, gal, lbs)"}
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-4">{t("chemistry.readings")}</h2>
          <div className="space-y-1">
            {FIELDS.map((f,i)=>{
              const v=parseFloat(vals[f.key as keyof typeof vals])||0;
              const warn=f.key==="freeChlorine"?(v<1||v>4):f.key==="ph"?(v<7.2||v>7.6):false;
              return (<div key={f.key} className={`flex items-center justify-between py-3 ${i<FIELDS.length-1?"border-b border-slate-100":""}`}>
                <div><p className="text-sm font-medium text-slate-700">{f.label}</p>{f.target&&<p className="text-xs text-slate-400">Target: {f.target} {f.unit}</p>}</div>
                <div className="flex items-center gap-2">
                  <input type="number" value={vals[f.key as keyof typeof vals]} onChange={(e)=>setVals(p=>({...p,[f.key]:e.target.value}))} className={`w-24 text-right input py-1.5 text-sm ${warn?"border-amber-400 bg-amber-50":""}`} step={f.step}/>
                  <span className="text-xs text-slate-400 w-10">{f.unit}</span>
                </div>
              </div>);
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-900">{t("chemistry.treatmentPlan")}</h2><span className="badge-blue">Live</span></div>
            <div className="space-y-3">
              {dosages.map((d,i)=>(
                <div key={i} className={`border rounded-xl p-3 ${URGENCY_COLOR[d.urgency]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1"><p className="font-semibold text-sm">{d.chemical==="balanced"?t("chemistry.balanced"):d.chemical}</p><p className="text-xs mt-0.5 opacity-80">{d.reason}</p></div>
                    {(d.flOz!==null||d.lbs!==null)&&<div className="text-right flex-shrink-0"><p className="font-bold text-lg font-mono">{formatDose(d)}</p></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-800 leading-relaxed">{t("chemistry.safety")}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">AI Analysis</h2>
              <button onClick={getAI} disabled={isPending} className="btn-primary text-xs px-3 py-1.5">
                {isPending?<><RefreshCw className="w-3 h-3 animate-spin"/>Analyzing...</>:<><Zap className="w-3 h-3"/>{t("chemistry.askAI")}</>}
              </button>
            </div>
            {aiAnalysis?<p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>:<p className="text-sm text-slate-400">Click "{t("chemistry.askAI")}" for deep analysis.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
