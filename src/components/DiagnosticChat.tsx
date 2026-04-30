"use client";

import { useState, useRef, useEffect } from "react";
import { ISSUE_TYPES } from "@/lib/diagnostic/issue-types";
import { Loader2, Send, AlertTriangle, CheckCircle2, Phone, DollarSign, Wrench, Waves } from "lucide-react";

interface Structured {
  diagnosis:        string | null;
  severity:         "low" | "medium" | "high" | "critical";
  safeToSwim:       boolean | null;
  immediateActions: string[];
  diagnosticSteps:  string[];
  likelyCauses:     string[];
  estimatedCost:    { low: number; high: number } | null;
  callAPro:         boolean;
  callAProReason:   string | null;
  followUpQuestion: string | null;
  message:          string;
}

interface Message {
  role:       "user" | "assistant";
  text:       string;
  structured?: Structured;
}

interface Props {
  poolId?:   number;
  userRole?: "tech" | "homeowner";
}

const SEVERITY_STYLE: Record<string, string> = {
  low:      "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium:   "border-amber-200 bg-amber-50 text-amber-800",
  high:     "border-orange-200 bg-orange-50 text-orange-800",
  critical: "border-red-200 bg-red-50 text-red-800",
};

function DiagnosisCard({ s }: { s: Structured }) {
  return (
    <div className="space-y-3 mt-3">
      {/* Severity + swim */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${SEVERITY_STYLE[s.severity] ?? SEVERITY_STYLE.medium}`}>
          {s.severity} severity
        </span>
        {s.safeToSwim !== null && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${s.safeToSwim ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {s.safeToSwim ? "✓ Safe to swim" : "✗ Do not swim"}
          </span>
        )}
      </div>

      {/* Diagnosis */}
      {s.diagnosis && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Assessment</p>
          <p className="text-sm text-slate-800">{s.diagnosis}</p>
        </div>
      )}

      {/* Immediate actions */}
      {s.immediateActions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Do This Now</p>
          <ol className="space-y-1">
            {s.immediateActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#1756a9] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Likely causes */}
      {s.likelyCauses.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Likely Causes</p>
          <ul className="space-y-1">
            {s.likelyCauses.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost estimate */}
      {s.estimatedCost && (
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">Estimated repair cost:</span>
          <span className="font-bold text-slate-800">${s.estimatedCost.low}–${s.estimatedCost.high}</span>
        </div>
      )}

      {/* Call a pro */}
      {s.callAPro && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <Phone className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Recommend calling a professional</p>
            {s.callAProReason && <p className="text-xs text-amber-700 mt-0.5">{s.callAProReason}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagnosticChat({ poolId, userRole = "homeowner" }: Props) {
  const [step,        setStep]        = useState<"pick" | "chat">("pick");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [sessionId,   setSessionId]   = useState<number | null>(null);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startDiagnosis = async () => {
    if (!selectedKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostic/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ issueKey: selectedKey, poolId, userRole, description }),
      });
      const json = await res.json();
      if (json.sessionId) setSessionId(json.sessionId);
      setMessages([{ role: "assistant", text: json.structured?.message ?? "", structured: json.structured }]);
      setStep("chat");
    } catch { /* silent */ }
    setLoading(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    setInput("");
    setMessages(p => [...p, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostic/respond", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, message: text }),
      });
      const json = await res.json();
      setMessages(p => [...p, { role: "assistant", text: json.structured?.message ?? "", structured: json.structured }]);
    } catch { /* silent */ }
    setLoading(false);
  };

  const issue = ISSUE_TYPES.find(i => i.key === selectedKey);

  if (step === "pick") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 mb-1">What issue are you having?</h3>
          <p className="text-sm text-slate-500">Select the problem that best matches what you're seeing</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ISSUE_TYPES.map(issue => (
            <button
              key={issue.key}
              onClick={() => setSelectedKey(issue.key)}
              className={`p-3 rounded-xl border text-left transition-all ${selectedKey === issue.key ? "border-[#1756a9] bg-[#e8f1fc]" : "border-slate-200 hover:border-slate-300 bg-white"}`}
            >
              <p className="text-lg mb-1">{issue.icon}</p>
              <p className={`text-xs font-bold ${selectedKey === issue.key ? "text-[#1756a9]" : "text-slate-700"}`}>{issue.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{issue.description}</p>
            </button>
          ))}
        </div>
        {selectedKey && (
          <div className="space-y-3">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`Describe what you're seeing with the ${issue?.label ?? "issue"} (optional)`}
              className="input w-full h-20 resize-none text-sm"
            />
            <button
              onClick={startDiagnosis}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              {loading ? "Diagnosing…" : "Start Diagnosis"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Chat step
  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 mb-3">
        <span className="text-xl">{issue?.icon}</span>
        <div className="flex-1">
          <p className="font-bold text-slate-900">{issue?.label}</p>
          <p className="text-xs text-slate-400">AI Diagnostic · Pool {poolId ? `#${poolId}` : ""}</p>
        </div>
        <button onClick={() => { setStep("pick"); setMessages([]); setSelectedKey(null); setDescription(""); }} className="btn-outline text-xs py-1.5">New Issue</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="bg-[#1756a9] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] text-sm">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[90%]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pool-500 to-[#00c3e3] flex items-center justify-center">
                    <Waves className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">PoolPal AI</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 shadow-sm">
                  <p>{m.text}</p>
                  {m.structured && <DiagnosisCard s={m.structured} />}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
        <input
          className="input flex-1 text-sm"
          placeholder="Answer the follow-up or add more details…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="btn-primary p-2.5 aspect-square"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
