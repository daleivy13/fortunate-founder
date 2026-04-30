"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/equipment-knowledge";
import {
  ChevronLeft, CheckCircle2, AlertTriangle, Wrench,
  Clock, Calendar, Phone, BookOpen,
} from "lucide-react";

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate:"bg-amber-50 text-amber-700 border-amber-200",
  advanced:    "bg-red-50 text-red-700 border-red-200",
};

const SEASON_EMOJI: Record<string, string> = {
  Spring:"🌱", Summer:"☀️", Fall:"🍂", Winter:"❄️",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function LearnCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const article = getArticle(category);
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Back */}
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-[#1756a9] hover:underline">
          <ChevronLeft className="w-4 h-4" />Back to Library
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{article.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900">{article.title}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${DIFFICULTY_STYLE[article.difficulty]}`}>
                  {article.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.lifespan}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{article.serviceInterval}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{article.overview}</p>
            </div>
          </div>
        </div>

        {/* Key Parts */}
        <Section title="Key Parts">
          <div className="space-y-2">
            {article.keyParts.map(part => (
              <div key={part.name} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#1756a9] flex-shrink-0 mt-1.5" />
                <div>
                  <span className="font-semibold text-slate-800">{part.name}</span>
                  <span className="text-slate-500"> — {part.description}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Common Issues */}
        <Section title="Common Issues & Fixes">
          <div className="space-y-3">
            {article.commonIssues.map(issue => (
              <div key={issue.issue} className={`rounded-xl border p-3 ${issue.callPro ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-slate-800">{issue.issue}</p>
                  {issue.callPro && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Phone className="w-3 h-3" />Call a Pro
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {issue.symptoms.map(s => (
                    <span key={s} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
                <div className="flex items-start gap-1.5 text-sm text-slate-700">
                  <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {issue.fix}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Maintenance Checklist */}
        <Section title="Maintenance Checklist">
          <div className="space-y-2">
            {article.maintenanceChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </Section>

        {/* Seasonal Tips */}
        <Section title="Seasonal Tips">
          <div className="grid grid-cols-2 gap-2">
            {article.seasonalTips.map(tip => (
              <div key={tip.season} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs font-bold text-slate-700 mb-1">{SEASON_EMOJI[tip.season]} {tip.season}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{tip.tip}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Pro Tip */}
        <div className="bg-[#e8f1fc] border border-[#1756a9]/20 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-[#1756a9] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#1756a9] mb-1">Pro Tip</p>
            <p className="text-sm text-slate-700">{article.proTip}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-600 mb-3">Have a problem with your {article.title.toLowerCase()}?</p>
          <Link href="/diagnostic">
            <button className="btn-primary text-sm flex items-center gap-2 mx-auto">
              <AlertTriangle className="w-4 h-4" />
              Run AI Diagnostic
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
