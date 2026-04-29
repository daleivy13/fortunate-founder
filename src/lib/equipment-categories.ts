export interface EquipmentCategory {
  key:              string;
  label:            string;
  icon:             string;
  lifespanYears:    number;
  serviceIntervalDays: number;
}

export const EQUIPMENT_CATEGORIES: Record<string, EquipmentCategory> = {
  pump_standard:         { key: "pump_standard",         label: "Standard Pump",          icon: "⚙️",  lifespanYears: 8,  serviceIntervalDays: 90  },
  pump_variable_speed:   { key: "pump_variable_speed",   label: "Variable Speed Pump",    icon: "⚙️",  lifespanYears: 10, serviceIntervalDays: 90  },
  filter_cartridge:      { key: "filter_cartridge",      label: "Cartridge Filter",       icon: "🔵",  lifespanYears: 5,  serviceIntervalDays: 30  },
  filter_de:             { key: "filter_de",             label: "DE Filter",              icon: "🔵",  lifespanYears: 10, serviceIntervalDays: 30  },
  filter_sand:           { key: "filter_sand",           label: "Sand Filter",            icon: "🟡",  lifespanYears: 7,  serviceIntervalDays: 60  },
  heater_gas:            { key: "heater_gas",            label: "Gas Heater",             icon: "🔥",  lifespanYears: 12, serviceIntervalDays: 180 },
  heat_pump:             { key: "heat_pump",             label: "Heat Pump",              icon: "🌡️",  lifespanYears: 15, serviceIntervalDays: 180 },
  salt_cell:             { key: "salt_cell",             label: "Salt Cell",              icon: "🧂",  lifespanYears: 5,  serviceIntervalDays: 90  },
  chlorinator:           { key: "chlorinator",           label: "Chlorinator",            icon: "🧪",  lifespanYears: 8,  serviceIntervalDays: 60  },
  automation_system:     { key: "automation_system",     label: "Automation System",      icon: "🖥️",  lifespanYears: 15, serviceIntervalDays: 365 },
  pool_cleaner_robot:    { key: "pool_cleaner_robot",    label: "Robotic Cleaner",        icon: "🤖",  lifespanYears: 5,  serviceIntervalDays: 30  },
  pool_cleaner_pressure: { key: "pool_cleaner_pressure", label: "Pressure-Side Cleaner",  icon: "🌀",  lifespanYears: 8,  serviceIntervalDays: 60  },
  pool_cleaner_suction:  { key: "pool_cleaner_suction",  label: "Suction-Side Cleaner",   icon: "🌊",  lifespanYears: 6,  serviceIntervalDays: 60  },
  pool_light:            { key: "pool_light",            label: "Pool Light",             icon: "💡",  lifespanYears: 7,  serviceIntervalDays: 365 },
  pool_cover:            { key: "pool_cover",            label: "Pool Cover",             icon: "🔲",  lifespanYears: 8,  serviceIntervalDays: 180 },
  uv_system:             { key: "uv_system",             label: "UV Sanitation System",   icon: "☀️",  lifespanYears: 10, serviceIntervalDays: 365 },
  ozonator:              { key: "ozonator",              label: "Ozonator",               icon: "💨",  lifespanYears: 10, serviceIntervalDays: 365 },
  other:                 { key: "other",                 label: "Other Equipment",        icon: "🔧",  lifespanYears: 10, serviceIntervalDays: 180 },
};

export const EQUIPMENT_BRANDS = [
  "Pentair", "Hayward", "Jandy", "Polaris", "Maytronics",
  "Zodiac", "Sta-Rite", "Raypak", "AquaCal", "Other",
];

export function getCategoryInfo(key: string): EquipmentCategory {
  return EQUIPMENT_CATEGORIES[key] ?? EQUIPMENT_CATEGORIES.other;
}
