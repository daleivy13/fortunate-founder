import { RANGES, ChemParameter, ReadingStatus } from "./ranges";

export interface ClassifyResult {
  status: ReadingStatus;
  parameter: ChemParameter;
  value: number;
  direction: "low" | "high" | "ok";
}

export function classifyReading(parameter: ChemParameter, value: number): ReadingStatus {
  const r = RANGES[parameter];
  if (!r) return "acceptable";

  // Check out_of_compliance (worst)
  if (parameter === "freeChlorine" && (value < 1.0 || value > 8.0)) return "out_of_compliance";
  if (parameter === "ph"           && (value < 6.8 || value > 8.2)) return "out_of_compliance";
  if (parameter === "alkalinity"   && (value < 40  || value > 220)) return "out_of_compliance";

  if (value < r.warningLow.max && value >= r.warningLow.min) return "warning_low";
  if (value > r.warningHigh.min && value <= r.warningHigh.max) return "warning_high";

  if (value >= r.acceptable.min && value <= r.acceptable.max) {
    if (value >= r.optimal.min && value <= r.optimal.max) return "optimal";
    return "acceptable";
  }

  return "out_of_compliance";
}

const STATUS_RANK: Record<ReadingStatus, number> = {
  optimal:           0,
  acceptable:        1,
  warning_low:       2,
  warning_high:      2,
  out_of_compliance: 3,
};

export function classifyAllReadings(readings: { freeChlorine?: number; ph?: number; alkalinity?: number }): {
  worstStatus: ReadingStatus;
  details: ClassifyResult[];
} {
  const details: ClassifyResult[] = [];

  const entries: [ChemParameter, number | undefined][] = [
    ["freeChlorine", readings.freeChlorine],
    ["ph",           readings.ph],
    ["alkalinity",   readings.alkalinity],
  ];

  for (const [param, value] of entries) {
    if (value === undefined || value === null) continue;
    const status    = classifyReading(param, value);
    const direction = status === "warning_low" || (status === "out_of_compliance" && value < RANGES[param].optimal.min) ? "low"
                    : status === "warning_high" || (status === "out_of_compliance" && value > RANGES[param].optimal.max) ? "high"
                    : "ok";
    details.push({ status, parameter: param, value, direction });
  }

  const worstStatus = details.reduce<ReadingStatus>((worst, d) => {
    return STATUS_RANK[d.status] > STATUS_RANK[worst] ? d.status : worst;
  }, "optimal");

  return { worstStatus, details };
}
