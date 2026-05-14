// Chemical affiliate configuration
// Set up Amazon Associates: https://affiliate-program.amazon.com
// Your affiliate tag goes in AMAZON_AFFILIATE_TAG env var
// Leslie's affiliate: sign up at ShareASale, set LESLIES_AFFILIATE_TAG env var

const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "poolpalai-20";
const LESLIES_TAG   = process.env.NEXT_PUBLIC_LESLIES_TAG           ?? "";

export type ChemicalCategory = "chlorine" | "ph" | "alkalinity" | "algae" | "shock" | "stabilizer" | "test";

export interface AffiliateProduct {
  name:              string;
  brand:             string;
  description:       string;
  priceRange:        string;
  amazonUrl:         string;
  lesliesUrl?:       string;
  imageEmoji:        string;
  category:          ChemicalCategory;
  amazonPriceCents:  number;
  lesliesPriceCents: number | null;
}

// Maps chemistry screen chemical names → catalog category
export function chemicalToCategory(chemical: string): ChemicalCategory | null {
  const c = chemical.toLowerCase();
  if (c.includes("chlorine"))               return "chlorine";
  if (c.includes("shock"))                  return "shock";
  if (c.includes("muriatic") || c.includes("ph down") || c.includes("soda ash") || c.includes("ph up")) return "ph";
  if (c.includes("baking soda") || c.includes("alk")) return "alkalinity";
  if (c.includes("stabilizer") || c.includes("cya")) return "stabilizer";
  if (c.includes("algae") || c.includes("algaecide")) return "algae";
  return null;
}

function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ogi`;
}

function lesliesUrl(slug: string): string {
  const tag = LESLIES_TAG ? `?affid=${LESLIES_TAG}` : "";
  return `https://www.lesliespool.com/${slug}${tag}`;
}

export const PRODUCTS: AffiliateProduct[] = [
  {
    name: "In The Swim Liquid Chlorine 12.5%", brand: "In The Swim",
    description: "Professional-grade, 12.5% sodium hypochlorite, 4-pack",
    priceRange: "$29–49 / 4-pack", imageEmoji: "🫧",
    amazonUrl:         amazonUrl("B000BPFQ6G"),
    lesliesUrl:        lesliesUrl("search?q=liquid+chlorine+1+gallon"),
    amazonPriceCents:  3499,
    lesliesPriceCents: 3199,
    category: "chlorine",
  },
  {
    name: "In The Swim Pool Chlorine Tablets", brand: "In The Swim",
    description: "3-inch trichlor tablets, 50 lbs — slow release",
    priceRange: "$79–109 / 50 lbs", imageEmoji: "💊",
    amazonUrl:         amazonUrl("B000BPFW3E"),
    lesliesUrl:        lesliesUrl("search?q=chlorine+tablets+50+lbs"),
    amazonPriceCents:  8999,
    lesliesPriceCents: 8499,
    category: "chlorine",
  },
  {
    name: "Jasco Muriatic Acid 1 Gallon", brand: "Jasco",
    description: "31.45% strength for pH & alkalinity reduction",
    priceRange: "$8–12", imageEmoji: "⚗️",
    amazonUrl:         amazonUrl("B0009XE18C"),
    lesliesUrl:        lesliesUrl("search?q=muriatic+acid"),
    amazonPriceCents:  999,
    lesliesPriceCents: 849,
    category: "ph",
  },
  {
    name: "HTH pH Up (Soda Ash) 4 lbs", brand: "HTH",
    description: "Sodium carbonate, raises pH safely",
    priceRange: "$9–14", imageEmoji: "🔼",
    amazonUrl:         amazonUrl("B000BRNWQE"),
    lesliesUrl:        lesliesUrl("search?q=ph+up+soda+ash"),
    amazonPriceCents:  1199,
    lesliesPriceCents: 999,
    category: "ph",
  },
  {
    name: "In The Swim Alkalinity Up 10 lbs", brand: "In The Swim",
    description: "Sodium bicarbonate, raises total alkalinity",
    priceRange: "$12–18", imageEmoji: "🧪",
    amazonUrl:         amazonUrl("B0002567VO"),
    lesliesUrl:        lesliesUrl("search?q=alkalinity+up"),
    amazonPriceCents:  1499,
    lesliesPriceCents: 1299,
    category: "alkalinity",
  },
  {
    name: "Arm & Hammer Baking Soda 4 lbs", brand: "Arm & Hammer",
    description: "Budget pick — same chemistry as branded alkalinity up",
    priceRange: "$6–10", imageEmoji: "🥄",
    amazonUrl:         amazonUrl("B000N95V70"),
    lesliesUrl:        null,
    amazonPriceCents:  699,
    lesliesPriceCents: null,
    category: "alkalinity",
  },
  {
    name: "HTH Super Shock 6-Pack", brand: "HTH",
    description: "73% calcium hypochlorite shock treatment",
    priceRange: "$24–35", imageEmoji: "⚡",
    amazonUrl:         amazonUrl("B0009H1Q7E"),
    lesliesUrl:        lesliesUrl("search?q=super+shock"),
    amazonPriceCents:  2999,
    lesliesPriceCents: 2749,
    category: "shock",
  },
  {
    name: "Clorox Pool Algaecide 60%", brand: "Clorox",
    description: "60% poly algaecide, prevents green and black algae",
    priceRange: "$14–22", imageEmoji: "🌿",
    amazonUrl:         amazonUrl("B000BPFZD2"),
    lesliesUrl:        lesliesUrl("search?q=algaecide+60"),
    amazonPriceCents:  1799,
    lesliesPriceCents: 1599,
    category: "algae",
  },
  {
    name: "In The Swim CYA Stabilizer 4 lbs", brand: "In The Swim",
    description: "Cyanuric acid, shields chlorine from UV burn-off",
    priceRange: "$18–28", imageEmoji: "☀️",
    amazonUrl:         amazonUrl("B000BPG9JS"),
    lesliesUrl:        lesliesUrl("search?q=cyanuric+acid+stabilizer"),
    amazonPriceCents:  2299,
    lesliesPriceCents: 2099,
    category: "stabilizer",
  },
  {
    name: "Taylor K-2006 Test Kit", brand: "Taylor Technologies",
    description: "Professional 6-way liquid test kit — most accurate",
    priceRange: "$45–65", imageEmoji: "🔬",
    amazonUrl:         amazonUrl("B000BNBEIS"),
    lesliesUrl:        lesliesUrl("search?q=taylor+k-2006"),
    amazonPriceCents:  5499,
    lesliesPriceCents: 5199,
    category: "test",
  },
  {
    name: "LaMotte ColorQ Pro 7", brand: "LaMotte",
    description: "Digital photometer — no color matching needed",
    priceRange: "$85–110", imageEmoji: "📊",
    amazonUrl:         amazonUrl("B001B4JWGQ"),
    lesliesUrl:        null,
    amazonPriceCents:  9499,
    lesliesPriceCents: null,
    category: "test",
  },
];

// Get recommended products based on chemistry readings
export function getRecommendedProducts(readings: {
  freeChlorine?: number; ph?: number; totalAlkalinity?: number;
  cyanuricAcid?: number;
}): AffiliateProduct[] {
  const recs: AffiliateProduct[] = [];

  if ((readings.freeChlorine ?? 2) < 1.0) {
    recs.push(PRODUCTS.find((p) => p.category === "shock")!);
    recs.push(PRODUCTS.find((p) => p.category === "chlorine")!);
  } else if ((readings.freeChlorine ?? 2) < 2.0) {
    recs.push(PRODUCTS.find((p) => p.category === "chlorine")!);
  }

  if ((readings.ph ?? 7.4) > 7.6) recs.push(PRODUCTS.find((p) => p.name.includes("Muriatic"))!);
  if ((readings.ph ?? 7.4) < 7.2) recs.push(PRODUCTS.find((p) => p.category === "alkalinity")!);
  if ((readings.totalAlkalinity ?? 100) < 80) recs.push(PRODUCTS.find((p) => p.category === "alkalinity")!);
  if ((readings.cyanuricAcid ?? 40) < 30)     recs.push(PRODUCTS.find((p) => p.category === "stabilizer")!);

  // Always suggest test kit
  recs.push(PRODUCTS.find((p) => p.brand === "Taylor Technologies")!);

  return [...new Set(recs)].filter(Boolean).slice(0, 4);
}
