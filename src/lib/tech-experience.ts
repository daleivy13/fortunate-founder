// Tech experience system — levels, thresholds, guidance logic

export type ExperienceLevel = "new" | "developing" | "experienced" | "lead";

export interface TechProfile {
  id: number;
  experienceLevel?: string;
  startedDate?: string;
  servicesCompleted?: number;
  equipmentTrainedOn?: string[] | string;
  scenariosCompleted?: string[] | string;
}

const THRESHOLDS = {
  new:        { maxDays: 30,  maxServices: 50  },
  developing: { maxDays: 180, maxServices: 300 },
};

export function getEffectiveLevel(employee: TechProfile): ExperienceLevel {
  // Lead is always manual — trust the DB value
  if (employee.experienceLevel === "lead") return "lead";

  const started = employee.startedDate ? new Date(employee.startedDate) : null;
  const daysAtCompany = started ? Math.floor((Date.now() - started.getTime()) / 86400000) : 0;
  const services = employee.servicesCompleted ?? 0;

  if (daysAtCompany <= THRESHOLDS.new.maxDays && services < THRESHOLDS.new.maxServices) return "new";
  if (daysAtCompany <= THRESHOLDS.developing.maxDays || services < THRESHOLDS.developing.maxServices) return "developing";
  return "experienced";
}

export function getLevelLabel(level: ExperienceLevel): string {
  return { new: "New", developing: "Developing", experienced: "Experienced", lead: "Lead Tech" }[level];
}

export function getLevelColor(level: ExperienceLevel): string {
  return {
    new:        "bg-slate-100 text-slate-600",
    developing: "bg-blue-100 text-blue-700",
    experienced:"bg-emerald-100 text-emerald-700",
    lead:       "bg-amber-100 text-amber-700",
  }[level];
}

export function getDaysToNextLevel(employee: TechProfile): { label: string; pct: number } {
  const level = getEffectiveLevel(employee);
  if (level === "lead" || level === "experienced") return { label: "Max level", pct: 100 };

  const started = employee.startedDate ? new Date(employee.startedDate) : new Date();
  const daysAtCompany = Math.floor((Date.now() - started.getTime()) / 86400000);
  const services = employee.servicesCompleted ?? 0;

  if (level === "new") {
    const dayPct = Math.min((daysAtCompany / THRESHOLDS.new.maxDays) * 100, 100);
    const svcPct = Math.min((services / THRESHOLDS.new.maxServices) * 100, 100);
    const pct = Math.round((dayPct + svcPct) / 2);
    const remaining = Math.max(THRESHOLDS.new.maxDays - daysAtCompany, 0);
    return { label: remaining > 0 ? `${remaining} days to Developing` : `${Math.max(THRESHOLDS.new.maxServices - services, 0)} services to Developing`, pct };
  }

  // developing → experienced
  const dayPct = Math.min((daysAtCompany / THRESHOLDS.developing.maxDays) * 100, 100);
  const svcPct = Math.min((services / THRESHOLDS.developing.maxServices) * 100, 100);
  const pct = Math.round((dayPct + svcPct) / 2);
  const remServices = Math.max(THRESHOLDS.developing.maxServices - services, 0);
  return { label: remServices > 0 ? `${remServices} services to Experienced` : "Ready for promotion", pct };
}

export function shouldShowGuidance(employee: TechProfile, context: "service_step" | "equipment_type" | "scenario", equipmentType?: string): boolean {
  const level = getEffectiveLevel(employee);
  if (level === "lead" || level === "experienced") return false;
  if (level === "new") return true;

  // developing — show for unfamiliar equipment
  if (context === "equipment_type" && equipmentType) {
    const trained = parseJsonField<string[]>(employee.equipmentTrainedOn, []);
    return !trained.includes(equipmentType);
  }

  return false;
}

function parseJsonField<T>(field: string[] | string | undefined, fallback: T): T {
  if (!field) return fallback;
  if (Array.isArray(field)) return field as unknown as T;
  try { return JSON.parse(field) as T; } catch { return fallback; }
}

// API helpers — call these from server-side code
export async function incrementServicesCompleted(employeeId: number, db: any, sql: any) {
  await db.execute(sql`
    UPDATE employees SET services_completed = COALESCE(services_completed, 0) + 1 WHERE id = ${employeeId}
  `).catch(() => {});
  await db.execute(sql`
    INSERT INTO tech_training_events (employee_id, event_type, event_data)
    VALUES (${employeeId}, 'service_completed', '{}')
  `).catch(() => {});
}

export async function markEquipmentTrained(employeeId: number, equipmentType: string, db: any, sql: any) {
  await db.execute(sql`
    UPDATE employees SET
      equipment_trained_on = CASE
        WHEN equipment_trained_on IS NULL THEN ${JSON.stringify([equipmentType])}::jsonb
        WHEN equipment_trained_on @> ${JSON.stringify([equipmentType])}::jsonb THEN equipment_trained_on
        ELSE equipment_trained_on || ${JSON.stringify([equipmentType])}::jsonb
      END
    WHERE id = ${employeeId}
  `).catch(() => {});
  await db.execute(sql`
    INSERT INTO tech_training_events (employee_id, event_type, event_data)
    VALUES (${employeeId}, 'equipment_trained', ${JSON.stringify({ equipmentType })})
  `).catch(() => {});
}

export async function markScenarioCompleted(employeeId: number, scenarioKey: string, db: any, sql: any) {
  await db.execute(sql`
    UPDATE employees SET
      scenarios_completed = CASE
        WHEN scenarios_completed IS NULL THEN ${JSON.stringify([scenarioKey])}::jsonb
        WHEN scenarios_completed @> ${JSON.stringify([scenarioKey])}::jsonb THEN scenarios_completed
        ELSE scenarios_completed || ${JSON.stringify([scenarioKey])}::jsonb
      END
    WHERE id = ${employeeId}
  `).catch(() => {});
  await db.execute(sql`
    INSERT INTO tech_training_events (employee_id, event_type, event_data)
    VALUES (${employeeId}, 'scenario_completed', ${JSON.stringify({ scenarioKey })})
  `).catch(() => {});
}
