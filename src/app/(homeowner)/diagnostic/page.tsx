"use client";

import { Wrench } from "lucide-react";
import { DiagnosticChat } from "@/components/DiagnosticChat";

export default function DiagnosticPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1756a9] flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pool Diagnostic Assistant</h1>
          <p className="text-slate-500 text-sm mt-2">
            Describe your issue and our AI will walk you through diagnosing and fixing it.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <DiagnosticChat userRole="homeowner" />
        </div>

        <p className="text-center text-xs text-slate-400">
          AI diagnostics are for guidance only. Always consult a licensed pool professional for safety-critical repairs.
        </p>
      </div>
    </div>
  );
}
