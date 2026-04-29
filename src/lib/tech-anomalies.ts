// Tech anomaly detection stubs — will be wired to real data in next phase
// TODO: replace mock data with real DB queries once training events accumulate

export interface AnomalyResult {
  detected: boolean;
  severity: "low" | "medium" | "high";
  description: string;
}

export async function detectChemistryAnomalies(employeeId: number): Promise<AnomalyResult> {
  // TODO: Query chemistry_readings grouped by tech_id and compare reported values
  // against pool-specific baselines. Flag readings outside ±2 std deviations.
  return {
    detected: false,
    severity: "low",
    description: "Chemistry readings within normal variance (stub)",
  };
}

export async function detectServiceTimeAnomalies(employeeId: number): Promise<AnomalyResult> {
  // TODO: Query service_reports, calculate average stop duration per tech,
  // flag if consistently < 15 min (possible skip) or > 90 min (possible issue).
  return {
    detected: false,
    severity: "low",
    description: "Service durations within expected range (stub)",
  };
}

export async function runAllAnomalyChecks(employeeId: number): Promise<{
  chemistry: AnomalyResult;
  serviceTime: AnomalyResult;
  flagged: boolean;
}> {
  const [chemistry, serviceTime] = await Promise.all([
    detectChemistryAnomalies(employeeId),
    detectServiceTimeAnomalies(employeeId),
  ]);
  return {
    chemistry,
    serviceTime,
    flagged: chemistry.detected || serviceTime.detected,
  };
}
