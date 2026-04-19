"use client";

import {
  createContext, useContext, useState, useEffect,
  ReactNode, useCallback,
} from "react";
import {
  Locale, LocaleConfig, LOCALES, DEFAULT_LOCALE,
  getUnits, getPricing, formatCurrency, formatDate, isRTL,
  ChemUnits, convertSmallDose, convertLargeDose, convertVolume,
} from "./config";
import { t, TranslationKey } from "./translations";

interface I18nContextType {
  locale:   Locale;
  config:   LocaleConfig;
  units:    ChemUnits;
  setLocale:(locale: Locale) => void;
  t:        (key: TranslationKey) => string;
  currency: (amount: number) => string;
  date:     (d: Date) => string;
  rtl:      boolean;
  pricing:  ReturnType<typeof getPricing>;
  // Unit helpers
  displayVolume:    (gallons: number)  => string;
  displaySmallDose: (flOz: number)     => string;
  displayLargeDose: (lbs: number)      => string;
  displayTemp:      (fahrenheit: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "poolpal_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Detect locale from browser on first load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES[stored]) {
      setLocaleState(stored);
      return;
    }
    // Detect from browser
    const browserLang = navigator.language as Locale;
    if (LOCALES[browserLang]) {
      setLocaleState(browserLang);
    } else {
      // Try just the language part
      const lang = browserLang.split("-")[0];
      const match = Object.keys(LOCALES).find((l) => l.startsWith(lang)) as Locale | undefined;
      if (match) setLocaleState(match);
    }
  }, []);

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir  = isRTL(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem(STORAGE_KEY, loc);
  }, []);

  const config  = LOCALES[locale];
  const units   = getUnits(locale);
  const pricing = getPricing(locale);

  const displayVolume = useCallback((gallons: number) => {
    const v = convertVolume(gallons, units);
    return `${v.toLocaleString()} ${units.volume.abbr}`;
  }, [units]);

  const displaySmallDose = useCallback((flOz: number) => {
    const v = convertSmallDose(flOz, units);
    return `${v} ${units.smallDose.abbr}`;
  }, [units]);

  const displayLargeDose = useCallback((lbs: number) => {
    const v = convertLargeDose(lbs, units);
    return `${v} ${units.largeDose.abbr}`;
  }, [units]);

  const displayTemp = useCallback((fahrenheit: number) => {
    const v = units.temp.convert(fahrenheit);
    return `${v}${units.temp.abbr}`;
  }, [units]);

  const value: I18nContextType = {
    locale,
    config,
    units,
    setLocale,
    t:       (key: TranslationKey) => t(key, locale),
    currency:(amount: number)      => formatCurrency(amount, locale),
    date:    (d: Date)             => formatDate(d, locale),
    rtl:     isRTL(locale),
    pricing,
    displayVolume,
    displaySmallDose,
    displayLargeDose,
    displayTemp,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
