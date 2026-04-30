export interface InsuranceTier {
  key:           string;
  name:          string;
  monthlyPrice:  number;
  annualPrice:   number;
  coverage:      number; // max coverage in $
  deductible:    number;
  description:   string;
  features:      string[];
  bestFor:       string;
  badge?:        string;
}

export const INSURANCE_TIERS: InsuranceTier[] = [
  {
    key:          "essential",
    name:         "Essential",
    monthlyPrice: 19,
    annualPrice:  190,
    coverage:     25000,
    deductible:   1000,
    description:  "Basic liability and chemical incident coverage",
    features:     ["$25K liability coverage", "Chemical spill incidents", "Slip & fall at poolside", "24/7 claims support"],
    bestFor:      "Budget-conscious owners with newer pools",
  },
  {
    key:          "standard",
    name:         "Standard",
    monthlyPrice: 39,
    annualPrice:  390,
    coverage:     75000,
    deductible:   750,
    description:  "Full liability plus equipment breakdown",
    features:     ["$75K liability coverage", "Equipment breakdown up to $5K", "Chemical incidents", "Guest injury coverage", "Pool service verification"],
    bestFor:      "Most residential pool owners",
    badge:        "Popular",
  },
  {
    key:          "premium",
    name:         "Premium",
    monthlyPrice: 69,
    annualPrice:  690,
    coverage:     150000,
    deductible:   500,
    description:  "Comprehensive coverage including full equipment replacement",
    features:     ["$150K liability coverage", "Full equipment replacement up to $15K", "Water damage to home", "Loss of use coverage", "Priority claims (48h)", "PoolPal Protocol compliance discount"],
    bestFor:      "Owners with high-value equipment or heated pools",
  },
  {
    key:          "estate",
    name:         "Estate+",
    monthlyPrice: 129,
    annualPrice:  1290,
    coverage:     500000,
    deductible:   250,
    description:  "Premium coverage for luxury pools and spas",
    features:     ["$500K liability coverage", "Full replacement coverage", "Spa included", "Smart equipment coverage", "On-site adjuster visits", "Legal defense coverage", "VIP 24h claims hotline"],
    bestFor:      "Luxury pools, spas, water features, or HOA pools",
  },
  {
    key:          "commercial",
    name:         "Commercial",
    monthlyPrice: 249,
    annualPrice:  2490,
    coverage:     2000000,
    deductible:   1000,
    description:  "Business liability for pool service companies",
    features:     ["$2M commercial liability", "Worker injury coverage", "Vehicle coverage for service trucks", "Customer property damage", "E&O coverage", "Certificate of insurance on demand"],
    bestFor:      "Pool service companies and HOA operators",
  },
];

export interface Discount {
  name:  string;
  pct:   number; // e.g. 10 = 10% off
}

export function getApplicableDiscounts(checks: Record<string, boolean>): Discount[] {
  const discounts: Discount[] = [];
  if (checks.optimalStreak)     discounts.push({ name: "14+ Day Optimal Streak",  pct: 10 });
  if (checks.weeklyService)     discounts.push({ name: "Weekly Service Verified",  pct: 5  });
  if (checks.saltwater)         discounts.push({ name: "Saltwater System",         pct: 5  });
  if (checks.proServiceVerified)discounts.push({ name: "Verified Pro Service",     pct: 10 });
  if (checks.annualPay)         discounts.push({ name: "Annual Payment",           pct: 10 });
  return discounts;
}

export function applyDiscounts(basePrice: number, discounts: Discount[]): number {
  const totalPct = Math.min(discounts.reduce((s, d) => s + d.pct, 0), 35);
  return Math.round(basePrice * (1 - totalPct / 100) * 100) / 100;
}

export function getTierByKey(key: string): InsuranceTier | undefined {
  return INSURANCE_TIERS.find(t => t.key === key);
}
