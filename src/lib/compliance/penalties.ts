import { ChemParameter } from "./ranges";

export interface PenaltyLevel {
  level: "notification" | "tier_reduced" | "deductible_doubled" | "exclusions_active" | "suspended";
  description: string;
  dayRange: string;
}

export const PENALTY_TIMELINE: PenaltyLevel[] = [
  { level: "notification",       description: "Warning notification only",          dayRange: "Days 1–3"  },
  { level: "tier_reduced",       description: "Coverage tier reduced one level",    dayRange: "Days 4–7"  },
  { level: "deductible_doubled", description: "All deductibles doubled",            dayRange: "Days 8–10" },
  { level: "exclusions_active",  description: "Equipment-specific exclusions",      dayRange: "Days 11–13"},
  { level: "suspended",          description: "Coverage fully suspended",           dayRange: "Day 14+"   },
];

export function getPenaltyForDay(consecutiveDays: number): PenaltyLevel {
  if (consecutiveDays >= 14) return PENALTY_TIMELINE[4];
  if (consecutiveDays >= 11) return PENALTY_TIMELINE[3];
  if (consecutiveDays >= 8)  return PENALTY_TIMELINE[2];
  if (consecutiveDays >= 4)  return PENALTY_TIMELINE[1];
  return PENALTY_TIMELINE[0];
}

const EQUIPMENT_EXCLUSIONS: Record<string, string[]> = {
  low_ph:        ["heater_gas", "heat_pump", "salt_cell"],
  high_ph:       ["salt_cell", "filter_cartridge"],
  low_chlorine:  [],
  high_chlorine: ["pool_cover", "salt_cell"],
  low_alkalinity:["heater_gas", "heat_pump"],
};

export function getEquipmentExclusions(parameter: ChemParameter, direction: "low" | "high"): string[] {
  const key = `${direction}_${parameter === "freeChlorine" ? "chlorine" : parameter === "ph" ? "ph" : "alkalinity"}`;
  return EQUIPMENT_EXCLUSIONS[key] ?? [];
}

export const REWARD_MILESTONES = [
  { days: 14,  reward: "$25 chemicals credit" },
  { days: 30,  reward: "5% premium discount"  },
  { days: 90,  reward: "10% premium discount" },
  { days: 365, reward: "15% premium discount + priority service" },
];

export function getNextReward(consecutiveOptimalDays: number): { days: number; reward: string; daysLeft: number } | null {
  const next = REWARD_MILESTONES.find(m => m.days > consecutiveOptimalDays);
  if (!next) return null;
  return { ...next, daysLeft: next.days - consecutiveOptimalDays };
}
