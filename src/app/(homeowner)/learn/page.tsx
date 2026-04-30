"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Search, ChevronRight } from "lucide-react";
import { CATEGORY_LIST } from "@/lib/equipment-knowledge";

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate:"bg-amber-50 text-amber-700 border-amber-200",
  advanced:    "bg-red-50 text-red-700 border-red-200",
};

export default function LearnPage() {
  const [query, setQuery] = useState("");

  const filtered = CATEGORY_LIST.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1756a9] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Equipment Library</h1>
          <p className="text-slate-500 text-sm mt-2">
            Learn how your pool equipment works, how to maintain it, and how to fix common problems.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1756a9]/20 focus:border-[#1756a9]"
            placeholder="Search equipment…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Articles */}
        <div className="space-y-2">
          {filtered.map(a => (
            <Link key={a.category} href={`/learn/${a.category}`}>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="text-3xl">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${DIFFICULTY_BADGE[a.difficulty]}`}>
                      {a.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Lifespan: {a.lifespan}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No articles match "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
