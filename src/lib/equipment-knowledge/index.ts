export interface KnowledgeArticle {
  category:       string;
  title:          string;
  icon:           string;
  lifespan:       string;
  serviceInterval:string;
  difficulty:     "beginner" | "intermediate" | "advanced";
  overview:       string;
  keyParts:       { name: string; description: string }[];
  commonIssues:   { issue: string; symptoms: string[]; fix: string; callPro: boolean }[];
  maintenanceChecklist: string[];
  seasonalTips:   { season: string; tip: string }[];
  proTip:         string;
}

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    category: "pump",
    title: "Pool Pump",
    icon: "⚙️",
    lifespan: "8–12 years",
    serviceInterval: "Inspect every 3 months",
    difficulty: "intermediate",
    overview: "The pump is the heart of your pool's circulation system. It pulls water from the skimmer and main drain, pushes it through the filter, and returns it to the pool. Without it, your filter can't work and chemistry goes stagnant.",
    keyParts: [
      { name: "Impeller",       description: "Spinning fan that moves water — clogs kill flow" },
      { name: "Pump basket",    description: "Catches large debris before it hits the impeller" },
      { name: "Shaft seal",     description: "Keeps water from leaking into the motor" },
      { name: "Motor",          description: "Electric motor that spins the impeller" },
      { name: "Volute / housing",description: "Plastic housing around the impeller" },
    ],
    commonIssues: [
      { issue: "Pump not priming",    symptoms: ["Air bubbles in return lines","Gurgling sound","No flow"],      fix: "Check for air leaks at lid O-ring and unions. Ensure water level is above skimmer.", callPro: false },
      { issue: "Pump runs but no flow", symptoms: ["Motor hums","Pressure gauge reads 0"],                      fix: "Clogged impeller — remove basket, clean impeller with a pick.",                     callPro: false },
      { issue: "Loud grinding noise", symptoms: ["Grinding or squealing from motor"],                            fix: "Worn motor bearings — motor needs replacement.",                                    callPro: true  },
      { issue: "Leaking from shaft",  symptoms: ["Water dripping below motor","Wet motor"],                      fix: "Replace shaft seal.",                                                               callPro: false },
    ],
    maintenanceChecklist: [
      "Clean pump basket weekly",
      "Inspect lid O-ring for cracks — lubricate with Teflon grease",
      "Check for leaks at unions and lid",
      "Verify flow rate and pressure are normal",
      "Run pump 8–12 hours per day in summer",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Inspect and lube O-ring before opening. Check impeller after winter." },
      { season: "Summer",  tip: "Run longer in high heat. Check basket daily during heavy debris periods." },
      { season: "Fall",    tip: "Increase run time to handle leaf debris." },
      { season: "Winter",  tip: "Winterize by blowing out lines or drain pump if freezing temps expected." },
    ],
    proTip: "Variable-speed pumps (VSPs) can cut energy costs by 60–80% vs. single-speed. They pay for themselves in 2–3 years.",
  },
  {
    category: "filter",
    title: "Pool Filter",
    icon: "🔵",
    lifespan: "15–20 years (tank); media replaced per type",
    serviceInterval: "Backwash when pressure rises 8–10 PSI above clean baseline",
    difficulty: "beginner",
    overview: "The filter removes particles too small for the pump basket to catch. Three types: sand (simplest), cartridge (most common for residential), and D.E. (finest filtration). Each filters differently but all clean the pool water.",
    keyParts: [
      { name: "Filter tank",     description: "Pressure vessel containing the filter media" },
      { name: "Filter media",    description: "Sand, cartridge elements, or D.E. powder that traps particles" },
      { name: "Multiport valve", description: "Controls filter/backwash/rinse/recirculate modes (sand/D.E.)" },
      { name: "Pressure gauge",  description: "Shows filter operating pressure — key diagnostic tool" },
      { name: "Sight glass",     description: "On sand/D.E. filters — shows clarity of backwash water" },
    ],
    commonIssues: [
      { issue: "High filter pressure",    symptoms: ["Pressure gauge above 25–30 PSI","Reduced return flow"],    fix: "Backwash (sand/D.E.) or clean cartridge.",               callPro: false },
      { issue: "Cloudy water after clean",symptoms: ["Water won't clear despite normal chemistry"],             fix: "Media may need replacement. D.E.: replenish powder. Sand: change every 5 yrs.", callPro: false },
      { issue: "D.E. returning to pool",  symptoms: ["White powder in pool after backwash"],                    fix: "Broken lateral or torn filter grid — needs inspection.",  callPro: true  },
      { issue: "Filter leaks at valve",   symptoms: ["Water leak from multiport valve"],                        fix: "Replace spider gasket inside multiport valve.",           callPro: false },
    ],
    maintenanceChecklist: [
      "Note clean pressure baseline on new media — write on filter with marker",
      "Backwash when pressure rises 8–10 PSI above baseline",
      "Sand: replace media every 5–7 years",
      "Cartridge: rinse monthly; replace every 1–2 years",
      "D.E.: replenish after every backwash (add 80% of original charge)",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Deep-clean cartridges with acid wash before opening season." },
      { season: "Summer",  tip: "Check pressure weekly. High bather load = faster clogging." },
      { season: "Fall",    tip: "Backwash before closing to remove debris buildup." },
      { season: "Winter",  tip: "Remove cartridges and store dry. Open D.E. tank drain." },
    ],
    proTip: "Never switch a multiport valve while the pump is running — you'll crack the spider gasket.",
  },
  {
    category: "heater",
    title: "Pool Heater",
    icon: "🔥",
    lifespan: "7–15 years",
    serviceInterval: "Annual service before swim season",
    difficulty: "advanced",
    overview: "Pool heaters use gas (natural or propane), electricity (heat pump), or solar panels to warm pool water. Gas heaters heat fastest. Heat pumps are most efficient in warm climates. Solar is lowest operating cost but slowest.",
    keyParts: [
      { name: "Heat exchanger",  description: "Copper or titanium tubes where pool water is heated" },
      { name: "Burner assembly", description: "Gas jets that heat the exchanger (gas heaters)" },
      { name: "Bypass valve",    description: "Regulates water flow through the heater" },
      { name: "Thermostat/PCB",  description: "Electronic control board — the brain of the heater" },
      { name: "Pressure switch", description: "Safety switch — cuts power if flow is insufficient" },
    ],
    commonIssues: [
      { issue: "Heater ignites but shuts off", symptoms: ["Starts then stops after a few seconds","Error code"],      fix: "Low flow issue — check pressure switch, bypass valve, and filter pressure.",   callPro: true  },
      { issue: "Error code on display",        symptoms: ["Error/fault code shown on panel"],                          fix: "Look up code in manual. Most are flow, ignition, or temperature faults.",   callPro: true  },
      { issue: "Pool won't reach set temp",    symptoms: ["Heater runs but water stays cool"],                         fix: "Check thermostat setting, bypass position, and size vs. pool volume.",     callPro: false },
      { issue: "Corrosion / green staining",   symptoms: ["Green residue below heater","Copper in water"],             fix: "Heat exchanger pitting — low pH corrodes copper. Balance chemistry.",      callPro: true  },
    ],
    maintenanceChecklist: [
      "Service annually before season opens",
      "Keep pH above 7.2 to protect heat exchanger",
      "Clear debris from around heater (gas models need airflow)",
      "Check bypass valve position",
      "Winterize by draining fully if below 32°F expected",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Verify ignition before pool season. Test run for 15 minutes." },
      { season: "Summer",  tip: "Use a pool cover to retain heat overnight — saves 50–70% in heating costs." },
      { season: "Fall",    tip: "Run later in season with cover." },
      { season: "Winter",  tip: "Turn off gas at shutoff valve. Drain if in freeze zone." },
    ],
    proTip: "Heat pumps work best when air temp is above 55°F. Below that, gas heaters are faster and more reliable.",
  },
  {
    category: "saltwater",
    title: "Salt Chlorinator / SWG",
    icon: "🧂",
    lifespan: "5–7 years (cell)",
    serviceInterval: "Inspect cell every 3–4 months",
    difficulty: "intermediate",
    overview: "A salt water generator (SWG) converts dissolved salt into chlorine through electrolysis. The salt cell contains titanium plates coated with a special metal oxide — when electricity passes through, it generates hypochlorous acid (same as chlorine). The cell is the most expensive consumable.",
    keyParts: [
      { name: "Salt cell",       description: "Titanium plates that generate chlorine — replace every 5–7 years" },
      { name: "Control board",   description: "Sets chlorine output %, monitors cell, shows faults" },
      { name: "Flow sensor",     description: "Safety switch — shuts off cell if flow is too low" },
      { name: "T-cell housing",  description: "PVC plumbing fitting where the cell sits" },
    ],
    commonIssues: [
      { issue: "Low chlorine despite SWG running", symptoms: ["Chlorine <1 ppm","Green or cloudy water"],            fix: "Check salt level (should be 2700–3400 ppm). Inspect cell for scale buildup.",  callPro: false },
      { issue: "Cell scaling",                     symptoms: ["White calcium deposits on cell plates"],              fix: "Soak cell in diluted muriatic acid (4:1 water:acid) for 15 minutes.",         callPro: false },
      { issue: "Check salt / low salt error",      symptoms: ["Panel shows low salt warning"],                       fix: "Test actual salt with strips or meter — may just need cell cleaning.",         callPro: false },
      { issue: "Cell life warning",                symptoms: ["Panel shows cell replacement warning"],                fix: "Cell near end of life — typically 5–7 years or 10,000 hours.",               callPro: false },
    ],
    maintenanceChecklist: [
      "Check salt level monthly — target 2700–3400 ppm",
      "Inspect cell for scale every 3 months",
      "Keep CYA at 70–80 ppm (higher than non-salt pools)",
      "Clean cell with acid bath when calcium builds up",
      "Winterize cell — remove and store above freezing",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Test salt level before startup. Add salt to pool at least 24h before turning on SWG." },
      { season: "Summer",  tip: "Boost chlorine output during heat waves (>90°F) or heavy use." },
      { season: "Fall",    tip: "Reduce output as bather load drops." },
      { season: "Winter",  tip: "Remove cell and store indoors — cold temps can crack cell housing." },
    ],
    proTip: "Calcium scale on the cell is the #1 cause of SWG failures. Clean it before it builds up — prevention is far cheaper than replacement.",
  },
  {
    category: "robot",
    title: "Robotic Pool Cleaner",
    icon: "🤖",
    lifespan: "3–7 years",
    serviceInterval: "Clean filter after each use",
    difficulty: "beginner",
    overview: "Robotic cleaners run on low-voltage DC power from a power supply and use their own internal filter — they don't use your pool's filtration system. They scrub, vacuum, and filter the pool floor and walls. Modern units can be programmed and controlled via app.",
    keyParts: [
      { name: "Drive motors",    description: "Move the robot around the pool" },
      { name: "Brush roll",      description: "Scrubs algae and dirt from surfaces" },
      { name: "Filter basket/bag",description: "Traps debris — must be cleaned after each use" },
      { name: "Impeller",        description: "Creates suction to pull debris into filter" },
      { name: "Power supply",    description: "Transforms household current to low-voltage DC for safety" },
    ],
    commonIssues: [
      { issue: "Robot gets stuck",          symptoms: ["Stops moving","Gets stuck in corners or on stairs"],    fix: "Check for tangled cable. Adjust program settings. Use a floating cable swivel.", callPro: false },
      { issue: "Robot not picking up dirt", symptoms: ["Pool still dirty after cycle"],                          fix: "Clean filter basket/bag — a clogged filter kills suction.",                   callPro: false },
      { issue: "Power supply error light",  symptoms: ["Red light or error on power supply"],                   fix: "Check cable for damage. Remove robot from water and reset.",                  callPro: true  },
      { issue: "Robot moves slowly",        symptoms: ["Very slow movement, shorter than normal cycle"],         fix: "Dirty filter. Also check brush roll for tangled hair/debris.",               callPro: false },
    ],
    maintenanceChecklist: [
      "Clean filter basket/bag after every use",
      "Rinse robot with fresh water after removing from pool",
      "Inspect brush rolls for wear every 3 months",
      "Store power supply indoors — heat and UV degrade it",
      "Store robot out of direct sunlight",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Run robot first thing after opening to clean winter sediment from floor." },
      { season: "Summer",  tip: "Clean filter every 2 uses during heavy swim season." },
      { season: "Fall",    tip: "Run more frequently during leaf season — leaves clog filter quickly." },
      { season: "Winter",  tip: "Remove from pool, clean thoroughly, store in cool dry location." },
    ],
    proTip: "Never leave a robotic cleaner in the pool for more than 3 hours per cycle — the cables can tangle and the filters need time to dry between uses.",
  },
  {
    category: "lights",
    title: "Pool Lights",
    icon: "💡",
    lifespan: "5–25 years (LED lasts much longer than incandescent)",
    serviceInterval: "Inspect lens and cord annually",
    difficulty: "advanced",
    overview: "Pool lights come in incandescent (cheap, hot, short lifespan) and LED (efficient, color-changing, long lifespan). All lights must be properly grounded for safety — working with pool lights involves electrical safety considerations.",
    keyParts: [
      { name: "Lens",          description: "Tempered glass or plastic face that seals the light" },
      { name: "Lens gasket",   description: "Rubber seal between lens and housing — must be watertight" },
      { name: "Niche",         description: "Waterproof housing set into the pool wall during construction" },
      { name: "Ground wire",   description: "Safety ground — critical for preventing shock hazard" },
      { name: "Conduit",       description: "Tube that carries wiring from niche to junction box" },
    ],
    commonIssues: [
      { issue: "Light won't turn on",     symptoms: ["No light","Breaker trips when switched on"],             fix: "Check GFCI breaker. Water may have entered housing — dry out before testing.",  callPro: true },
      { issue: "Flickering light",        symptoms: ["Intermittent on/off or flickering"],                    fix: "Loose connection at junction box or failing lamp.",                          callPro: true },
      { issue: "Water in light housing",  symptoms: ["Visible water droplets behind lens","Discolored bulb"], fix: "Failed lens gasket — must be replaced. Keep GFCI to protect from shock.",    callPro: true },
      { issue: "GFCI keeps tripping",     symptoms: ["GFCI breaker trips immediately when light turned on"],  fix: "Ground fault — often water in conduit. Must be diagnosed by electrician.",   callPro: true },
    ],
    maintenanceChecklist: [
      "Test GFCI breaker monthly",
      "Inspect lens for cracks or discoloration annually",
      "Never service pool lights without turning off power at the breaker",
      "When replacing bulb, check lens gasket condition",
      "Ensure light cord has enough slack — pool settling can damage it",
    ],
    seasonalTips: [
      { season: "Spring",  tip: "Test all lights before swim season. Replace bulbs now to avoid mid-summer failures." },
      { season: "Summer",  tip: "Check that GFCI is functional — test monthly per NEC code." },
      { season: "Fall",    tip: "Note any flickering to address before closing." },
      { season: "Winter",  tip: "Leave lights off during winter to extend LED lifespan." },
    ],
    proTip: "ALWAYS assume pool lights are dangerous even when off. Water and electricity are lethal — hire a licensed electrician for any wiring work.",
  },
];

export function getArticle(category: string): KnowledgeArticle | undefined {
  return KNOWLEDGE_BASE.find(a => a.category === category);
}

export const CATEGORY_LIST = KNOWLEDGE_BASE.map(a => ({
  category:    a.category,
  title:       a.title,
  icon:        a.icon,
  difficulty:  a.difficulty,
  lifespan:    a.lifespan,
}));
