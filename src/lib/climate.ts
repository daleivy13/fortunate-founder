export type ClimateZone = "desert" | "tropical" | "subtropical" | "mediterranean" | "continental" | "mountain";

interface ZoneInfo {
  label:          string;
  seasonLength:   number; // typical swim season in months
  algaeRisk:      "low" | "medium" | "high";
  winterize:      boolean;
  chlorineBoost:  boolean; // hot climate = evaporates faster
  uvIntensity:    "low" | "medium" | "high";
}

export const ZONE_INFO: Record<ClimateZone, ZoneInfo> = {
  desert:       { label: "Desert / Arid",      seasonLength: 10, algaeRisk: "high",   winterize: false, chlorineBoost: true,  uvIntensity: "high"   },
  tropical:     { label: "Tropical",           seasonLength: 12, algaeRisk: "high",   winterize: false, chlorineBoost: true,  uvIntensity: "high"   },
  subtropical:  { label: "Subtropical",        seasonLength: 11, algaeRisk: "high",   winterize: false, chlorineBoost: true,  uvIntensity: "high"   },
  mediterranean:{ label: "Mediterranean",      seasonLength: 9,  algaeRisk: "medium", winterize: false, chlorineBoost: false, uvIntensity: "medium" },
  continental:  { label: "Continental",        seasonLength: 5,  algaeRisk: "medium", winterize: true,  chlorineBoost: false, uvIntensity: "low"    },
  mountain:     { label: "Mountain / Alpine",  seasonLength: 4,  algaeRisk: "low",    winterize: true,  chlorineBoost: false, uvIntensity: "medium" },
};

// Zip prefix → climate zone lookup (US only, coarse approximation)
const ZIP_ZONES: [string[], ClimateZone][] = [
  [["850","851","852","853","854","855","856","857","858","859","860","861","863","864","865","900","901","902","903","904","905","906","907","908","909","910","911","912","913","914","915","916","917","918","919","920","921","922","923","924","925","926","927","928","929","930","931","932","933","934","935","936","937","938","939","940","941","942","943","944","945","946","947","948","949","950","951","952","953","954","955","956","957","958","959","960","961"], "mediterranean"],
  [["700","701","702","703","704","705","706","707","708","709","710","711","712","713","714","715","716","717","718","719","720","721","722","723","724","725","726","727","728","729"], "subtropical"],
  [["330","331","332","333","334","335","336","337","338","339","340","341","342","344","346","347","349"], "subtropical"],
  [["760","761","762","763","764","765","766","767","768","769","770","771","772","773","774","775","776","777","778","779","780","781","782","783","784","785","786","787","788","789","790","791","792","793","794","795","796","797","798","799"], "desert"],
  [["890","891","893","894","895","897","898"], "desert"],
  [["967","968"], "tropical"],
  [["800","801","802","803","804","805","806","807","808","809","810","811","812","813","814","815","816","817","818","819"], "mountain"],
];

const STATE_ZONES: Record<string, ClimateZone> = {
  AZ:"desert",CA:"mediterranean",NV:"desert",NM:"desert",UT:"desert",
  FL:"subtropical",LA:"subtropical",MS:"subtropical",AL:"subtropical",GA:"subtropical",SC:"subtropical",
  TX:"subtropical",OK:"subtropical",AR:"subtropical",TN:"subtropical",
  HI:"tropical",
  CO:"mountain",WY:"mountain",MT:"mountain",ID:"mountain",
  WA:"continental",OR:"continental",
  NY:"continental",PA:"continental",OH:"continental",MI:"continental",IL:"continental",
  MN:"continental",WI:"continental",IA:"continental",MO:"continental",IN:"continental",
  NC:"mediterranean",VA:"continental",MD:"continental",
};

export function getClimateZoneFromZip(zip: string): ClimateZone {
  const prefix3 = zip.slice(0, 3);
  for (const [prefixes, zone] of ZIP_ZONES) {
    if (prefixes.includes(prefix3)) return zone;
  }
  return "continental";
}

export function getClimateZoneFromState(state: string): ClimateZone {
  return STATE_ZONES[state.toUpperCase()] ?? "continental";
}

export function getClimateZoneInfo(zone: ClimateZone): ZoneInfo {
  return ZONE_INFO[zone];
}
