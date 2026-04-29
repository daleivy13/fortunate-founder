export const RANGES = {
  freeChlorine: {
    optimal:     { min: 3.0, max: 5.0 },
    acceptable:  { min: 2.0, max: 6.0 },
    warningLow:  { min: 1.0, max: 2.0 },
    warningHigh: { min: 6.0, max: 8.0 },
    // Below 1.0 or above 8.0 = out of compliance
  },
  ph: {
    optimal:     { min: 7.4, max: 7.6 },
    acceptable:  { min: 7.2, max: 7.8 },
    warningLow:  { min: 6.8, max: 7.2 },
    warningHigh: { min: 7.8, max: 8.2 },
  },
  alkalinity: {
    optimal:     { min: 80,  max: 120 },
    acceptable:  { min: 60,  max: 180 },
    warningLow:  { min: 40,  max: 60  },
    warningHigh: { min: 180, max: 220 },
  },
} as const;

export type ChemParameter = keyof typeof RANGES;
export type ReadingStatus = "optimal" | "acceptable" | "warning_low" | "warning_high" | "out_of_compliance";
