"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, Locale } from "@/lib/i18n/config";

const LOCALE_GROUPS = [
  {
    region: "Americas",
    locales: ["en-US", "en-CA", "es-MX", "es-AR", "pt-BR", "fr-CA"] as Locale[],
  },
  {
    region: "Europe",
    locales: ["en-GB", "fr-FR", "de-DE", "it-IT", "es-ES", "pt-PT"] as Locale[],
  },
  {
    region: "Asia Pacific",
    locales: ["en-AU", "zh-CN", "ja-JP", "ko-KR"] as Locale[],
  },
  {
    region: "Middle East",
    locales: ["ar-SA", "ar-AE"] as Locale[],
  },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, config } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        title="Change language"
      >
        <Globe className="w-4 h-4" />
        {!compact && (
          <>
            <span>{config.flag}</span>
            <span className="hidden sm:inline">{config.name.split(" ")[0]}</span>
          </>
        )}
        {compact && <span>{config.flag}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto animate-fade-in">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Language & Region</p>
          </div>
          {LOCALE_GROUPS.map((group) => (
            <div key={group.region}>
              <div className="px-3 py-2 bg-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.region}</p>
              </div>
              {group.locales.map((loc) => {
                const cfg = LOCALES[loc];
                const isSelected = locale === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => { setLocale(loc); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                      isSelected ? "bg-[#e8f1fc] text-[#1756a9]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base w-6 text-center">{cfg.flag}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{cfg.name}</span>
                      <span className="text-slate-400 text-xs ml-2">{cfg.currencySymbol} {cfg.currency}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1756a9] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
