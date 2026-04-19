// ── Supported locales ──────────────────────────────────────────────────────────
export type Locale = 
  | "en-US" | "en-GB" | "en-AU" | "en-CA"
  | "es-MX" | "es-ES" | "es-AR"
  | "fr-FR" | "fr-CA"
  | "pt-BR" | "pt-PT"
  | "de-DE"
  | "it-IT"
  | "ar-SA" | "ar-AE"
  | "zh-CN"
  | "ja-JP"
  | "ko-KR";

export type UnitSystem = "imperial" | "metric";

export interface LocaleConfig {
  locale:       Locale;
  name:         string;       // Display name in that language
  nameEn:       string;       // English name
  flag:         string;       // Emoji flag
  currency:     string;       // ISO 4217
  currencySymbol:string;
  unitSystem:   UnitSystem;
  rtl:          boolean;
  dateFormat:   string;       // e.g. "MM/DD/YYYY"
  poolSeason:   string;       // Description of pool season
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  "en-US": { locale: "en-US", name: "English (US)",         nameEn: "English (US)",       flag: "🇺🇸", currency: "USD", currencySymbol: "$",  unitSystem: "imperial", rtl: false, dateFormat: "MM/DD/YYYY", poolSeason: "May–September" },
  "en-GB": { locale: "en-GB", name: "English (UK)",         nameEn: "English (UK)",       flag: "🇬🇧", currency: "GBP", currencySymbol: "£",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "June–August" },
  "en-AU": { locale: "en-AU", name: "English (Australia)",  nameEn: "English (Australia)",flag: "🇦🇺", currency: "AUD", currencySymbol: "A$", unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "November–March" },
  "en-CA": { locale: "en-CA", name: "English (Canada)",     nameEn: "English (Canada)",   flag: "🇨🇦", currency: "CAD", currencySymbol: "C$", unitSystem: "metric",   rtl: false, dateFormat: "MM/DD/YYYY", poolSeason: "June–August" },
  "es-MX": { locale: "es-MX", name: "Español (México)",     nameEn: "Spanish (Mexico)",   flag: "🇲🇽", currency: "MXN", currencySymbol: "$",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "Year-round" },
  "es-ES": { locale: "es-ES", name: "Español (España)",     nameEn: "Spanish (Spain)",    flag: "🇪🇸", currency: "EUR", currencySymbol: "€",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "May–September" },
  "es-AR": { locale: "es-AR", name: "Español (Argentina)",  nameEn: "Spanish (Argentina)",flag: "🇦🇷", currency: "ARS", currencySymbol: "$",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "November–March" },
  "fr-FR": { locale: "fr-FR", name: "Français (France)",    nameEn: "French (France)",    flag: "🇫🇷", currency: "EUR", currencySymbol: "€",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "June–September" },
  "fr-CA": { locale: "fr-CA", name: "Français (Canada)",    nameEn: "French (Canada)",    flag: "🇨🇦", currency: "CAD", currencySymbol: "C$", unitSystem: "metric",   rtl: false, dateFormat: "MM/DD/YYYY", poolSeason: "June–August" },
  "pt-BR": { locale: "pt-BR", name: "Português (Brasil)",   nameEn: "Portuguese (Brazil)",flag: "🇧🇷", currency: "BRL", currencySymbol: "R$", unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "November–March" },
  "pt-PT": { locale: "pt-PT", name: "Português (Portugal)", nameEn: "Portuguese (Portugal)",flag:"🇵🇹", currency: "EUR", currencySymbol: "€", unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "June–September" },
  "de-DE": { locale: "de-DE", name: "Deutsch (Deutschland)",nameEn: "German (Germany)",   flag: "🇩🇪", currency: "EUR", currencySymbol: "€",  unitSystem: "metric",   rtl: false, dateFormat: "DD.MM.YYYY", poolSeason: "June–August" },
  "it-IT": { locale: "it-IT", name: "Italiano (Italia)",    nameEn: "Italian (Italy)",    flag: "🇮🇹", currency: "EUR", currencySymbol: "€",  unitSystem: "metric",   rtl: false, dateFormat: "DD/MM/YYYY", poolSeason: "June–September" },
  "ar-SA": { locale: "ar-SA", name: "العربية (السعودية)",   nameEn: "Arabic (Saudi)",     flag: "🇸🇦", currency: "SAR", currencySymbol: "﷼",  unitSystem: "metric",   rtl: true,  dateFormat: "DD/MM/YYYY", poolSeason: "Year-round" },
  "ar-AE": { locale: "ar-AE", name: "العربية (الإمارات)",   nameEn: "Arabic (UAE)",       flag: "🇦🇪", currency: "AED", currencySymbol: "د.إ",unitSystem: "metric",   rtl: true,  dateFormat: "DD/MM/YYYY", poolSeason: "Year-round" },
  "zh-CN": { locale: "zh-CN", name: "中文（简体）",           nameEn: "Chinese (Simplified)",flag:"🇨🇳", currency: "CNY", currencySymbol: "¥",  unitSystem: "metric",   rtl: false, dateFormat: "YYYY/MM/DD", poolSeason: "June–September" },
  "ja-JP": { locale: "ja-JP", name: "日本語（日本）",          nameEn: "Japanese (Japan)",   flag: "🇯🇵", currency: "JPY", currencySymbol: "¥",  unitSystem: "metric",   rtl: false, dateFormat: "YYYY/MM/DD", poolSeason: "July–August" },
  "ko-KR": { locale: "ko-KR", name: "한국어（한국）",          nameEn: "Korean (Korea)",     flag: "🇰🇷", currency: "KRW", currencySymbol: "₩",  unitSystem: "metric",   rtl: false, dateFormat: "YYYY/MM/DD", poolSeason: "July–August" },
};

export const DEFAULT_LOCALE: Locale = "en-US";

// ── Pricing by region ──────────────────────────────────────────────────────────
// Prices are psychologically calibrated for each market, not just FX converted
export const REGIONAL_PRICING: Record<string, {
  starter: number; solo: number; growth: number; enterprise: number; currency: string; symbol: string;
}> = {
  "USD": { starter: 0, solo: 79,  growth: 179,  enterprise: 399,  currency: "USD", symbol: "$"   },
  "GBP": { starter: 0, solo: 59,  growth: 139,  enterprise: 299,  currency: "GBP", symbol: "£"   },
  "EUR": { starter: 0, solo: 69,  growth: 159,  enterprise: 349,  currency: "EUR", symbol: "€"   },
  "AUD": { starter: 0, solo: 119, growth: 269,  enterprise: 599,  currency: "AUD", symbol: "A$"  },
  "CAD": { starter: 0, solo: 99,  growth: 229,  enterprise: 499,  currency: "CAD", symbol: "C$"  },
  "MXN": { starter: 0, solo: 990, growth: 2290, enterprise: 4990, currency: "MXN", symbol: "$"   },
  "BRL": { starter: 0, solo: 349, growth: 799,  enterprise: 1799, currency: "BRL", symbol: "R$"  },
  "SAR": { starter: 0, solo: 299, growth: 679,  enterprise: 1499, currency: "SAR", symbol: "﷼"   },
  "AED": { starter: 0, solo: 299, growth: 679,  enterprise: 1499, currency: "AED", symbol: "د.إ" },
  "CNY": { starter: 0, solo: 499, growth: 1199, enterprise: 2699, currency: "CNY", symbol: "¥"   },
  "JPY": { starter: 0, solo: 9800,growth: 22800,enterprise: 49800,currency: "JPY", symbol: "¥"   },
  "KRW": { starter: 0, solo: 99000,growth:229000,enterprise:499000,currency:"KRW", symbol: "₩"   },
};

// ── Unit conversions ──────────────────────────────────────────────────────────
export interface ChemUnits {
  volume:    { name: string; abbr: string; toGallons: number };
  smallDose: { name: string; abbr: string; toFlOz: number };
  largeDose: { name: string; abbr: string; toLb: number };
  temp:      { name: string; abbr: string; convert: (v: number) => number };
}

export const IMPERIAL_UNITS: ChemUnits = {
  volume:    { name: "gallon",    abbr: "gal",  toGallons: 1 },
  smallDose: { name: "fluid oz",  abbr: "fl oz",toFlOz: 1 },
  largeDose: { name: "pound",     abbr: "lb",   toLb: 1 },
  temp:      { name: "Fahrenheit",abbr: "°F",   convert: (f) => f },
};

export const METRIC_UNITS: ChemUnits = {
  volume:    { name: "litre",    abbr: "L",   toGallons: 0.264172 },
  smallDose: { name: "millilitre",abbr: "mL", toFlOz: 29.5735 },
  largeDose: { name: "gram",     abbr: "g",   toLb: 453.592 },
  temp:      { name: "Celsius",  abbr: "°C",  convert: (f) => Math.round((f - 32) * 5 / 9 * 10) / 10 },
};

export function getUnits(locale: Locale): ChemUnits {
  return LOCALES[locale].unitSystem === "imperial" ? IMPERIAL_UNITS : METRIC_UNITS;
}

export function convertVolume(gallons: number, units: ChemUnits): number {
  return Math.round(gallons / units.volume.toGallons);
}

export function convertSmallDose(flOz: number, units: ChemUnits): number {
  return Math.round((flOz * units.smallDose.toFlOz) / 29.5735 * 10) / 10;
}

export function convertLargeDose(lbs: number, units: ChemUnits): number {
  return Math.round((lbs * units.largeDose.toLb) / 453.592 * 10) / 10;
}

export function getPricing(locale: Locale) {
  const currency = LOCALES[locale].currency;
  return REGIONAL_PRICING[currency] ?? REGIONAL_PRICING["USD"];
}

// ── Format helpers ─────────────────────────────────────────────────────────────
export function formatCurrency(amount: number, locale: Locale): string {
  const config = LOCALES[locale];
  return new Intl.NumberFormat(locale, {
    style:    "currency",
    currency: config.currency,
    maximumFractionDigits: config.currency === "JPY" || config.currency === "KRW" ? 0 : 0,
  }).format(amount);
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric",
  }).format(date);
}

export function isRTL(locale: Locale): boolean {
  return LOCALES[locale].rtl;
}
