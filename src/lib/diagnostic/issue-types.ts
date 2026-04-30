export interface IssueType {
  key:         string;
  label:       string;
  icon:        string;
  description: string;
  category:    "water" | "equipment" | "structure" | "safety";
}

export const ISSUE_TYPES: IssueType[] = [
  { key: "green_water",       label: "Green / Cloudy Water",    icon: "🟢", description: "Water is green, teal, or cloudy",          category: "water"     },
  { key: "foam",              label: "Foam on Surface",          icon: "🫧", description: "Persistent foam or bubbles on surface",    category: "water"     },
  { key: "algae",             label: "Algae Growth",             icon: "🌿", description: "Visible algae on walls, floor, or steps",  category: "water"     },
  { key: "staining",          label: "Stains / Discoloration",   icon: "🔴", description: "Brown, black, or rust stains on surfaces", category: "structure" },
  { key: "pump_not_running",  label: "Pump Not Running",         icon: "⚡", description: "Pump won't start or makes noise",          category: "equipment" },
  { key: "low_flow",          label: "Low Water Flow",           icon: "💧", description: "Weak jets, skimmer not pulling well",       category: "equipment" },
  { key: "heater_issue",      label: "Heater Not Working",       icon: "🔥", description: "Pool won't heat or heater shows error",    category: "equipment" },
  { key: "chlorinator_issue", label: "Salt / Chlorinator Issue", icon: "⚗️", description: "Salt cell error or low chlorine output",   category: "equipment" },
  { key: "leak",              label: "Suspected Leak",           icon: "🚨", description: "Water level dropping faster than normal",  category: "structure" },
  { key: "chemistry_off",     label: "Chemistry Out of Range",   icon: "🧪", description: "pH, chlorine, or other readings are off",  category: "water"     },
  { key: "robot_issue",       label: "Robotic Cleaner Issue",    icon: "🤖", description: "Robot not moving, stuck, or leaving debris", category: "equipment" },
  { key: "lights_issue",      label: "Lights Not Working",       icon: "💡", description: "LED or incandescent pool lights are out",  category: "safety"    },
];

export function getIssueType(key: string): IssueType | undefined {
  return ISSUE_TYPES.find(i => i.key === key);
}
