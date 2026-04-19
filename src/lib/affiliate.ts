// Chemical affiliate configuration
// Set up Amazon Associates: https://affiliate-program.amazon.com
// Your affiliate tag goes in AMAZON_AFFILIATE_TAG env var

const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "poolpalai-20";
const LESLIES_TAG   = process.env.NEXT_PUBLIC_LESLIES_TAG           ?? "";

export interface AffiliateProduct {
  name:        string;
  brand:       string;
  description: string;
  priceRange:  string;
  amazonUrl:   string;
  lesliesUrl?: string;
  imageEmoji:  string;
  category:    "chlorine" | "ph" | "alkalinity" | "algae" | "shock" | "stabilizer" | "test";
}

function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ogi`;
}

export const PRODUCTS: AffiliateProduct[] = [
  {
    name: "In The Swim Liquid Chlorine", brand: "In The Swim",
    description: "12.5% sodium hypochlorite, professional strength",
    priceRange: "$29–49 / 4-pack", imageEmoji: "🫧",
    amazonUrl: amazonUrl("B000BPFQ6G"),
    lesliesUrl: "https://www.lesliespool.com/search?q=liquid+chlorine",
    category: "chlorine",
  },
  {
    name: "Muriatic Acid 1 Gallon", brand: "Jasco",
    description: "31.45% strength for pH reduction",
    priceRange: "$8–12", imageEmoji: "⚗️",
    amazonUrl: amazonUrl("B0009XE18C"),
    category: "ph",
  },
  {
    name: "Arm & Hammer Baking Soda (Pool Grade)", brand: "Arm & Hammer",
    description: "Raises alkalinity safely and cheaply",
    priceRange: "$6–10 / 4 lbs", imageEmoji: "🧪",
    amazonUrl: amazonUrl("B000N95V70"),
    category: "alkalinity",
  },
  {
    name: "HTH Super Shock", brand: "HTH",
    description: "73% calcium hypochlorite shock treatment",
    priceRange: "$24–35 / 6-pack", imageEmoji: "⚡",
    amazonUrl: amazonUrl("B0009H1Q7E"),
    category: "shock",
  },
  {
    name: "Clorox Pool Algaecide 60%", brand: "Clorox",
    description: "60% poly algaecide, prevents green and black algae",
    priceRange: "$14–22", imageEmoji: "🌿",
    amazonUrl: amazonUrl("B000BPFZD2"),
    category: "algae",
  },
  {
    name: "Cyanuric Acid (Pool Stabilizer)", brand: "In The Swim",
    description: "Protects chlorine from UV degradation",
    priceRange: "$18–28 / 4 lbs", imageEmoji: "☀️",
    amazonUrl: amazonUrl("B000BPG9JS"),
    category: "stabilizer",
  },
  {
    name: "Taylor K-2006 Test Kit", brand: "Taylor Technologies",
    description: "Professional 6-way liquid test kit — most accurate",
    priceRange: "$45–65", imageEmoji: "🔬",
    amazonUrl: amazonUrl("B000BNBEIS"),
    category: "test",
  },
  {
    name: "LaMotte ColorQ Pro 7", brand: "LaMotte",
    description: "Digital photometer — no color matching needed",
    priceRange: "$85–110", imageEmoji: "📊",
    amazonUrl: amazonUrl("B001B4JWGQ"),
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
