import { useState, useMemo } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAnalyzeChemistry, usePools, useWeather } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { api } from "../src/lib/api";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";
import { ChemicalShopCard } from "../src/components/ChemicalShopCard";

// ── Types ─────────────────────────────────────────────────────────────────────
type Level = "optimal" | "acceptable" | "warning" | "out";

interface DoseItem {
  chemical:     string;
  amount:       string;
  action:       "Add" | "Reduce" | "Hold";
  reason:       string;
  weatherNote?: string;
  urgency:      "high" | "medium" | "low" | "hold";
}

// ── Chemistry level classifiers ────────────────────────────────────────────────
function getFCLevel(v: number): Level {
  if (v >= 3.0 && v <= 5.0) return "optimal";
  if (v >= 2.0 && v <= 6.0) return "acceptable";
  if ((v >= 1.0 && v < 2.0) || (v > 6.0 && v <= 8.0)) return "warning";
  return "out";
}
function getPHLevel(v: number): Level {
  if (v >= 7.4 && v <= 7.6) return "optimal";
  if (v >= 7.2 && v <= 7.8) return "acceptable";
  if ((v >= 6.8 && v < 7.2) || (v > 7.8 && v <= 8.2)) return "warning";
  return "out";
}
function getAlkLevel(v: number): Level {
  if (v >= 80 && v <= 120) return "optimal";
  if (v >= 60 && v <= 180) return "acceptable";
  if ((v >= 40 && v < 60) || (v > 180 && v <= 220)) return "warning";
  return "out";
}

const LEVEL_COLORS: Record<Level, string> = {
  optimal: "#059669", acceptable: "#0891b2", warning: "#d97706", out: "#dc2626",
};
const LEVEL_LABELS: Record<Level, string> = {
  optimal: "Optimal", acceptable: "OK", warning: "Warning", out: "Out of Range",
};
const LEVEL_BG: Record<Level, string> = {
  optimal: "#d1fae5", acceptable: "#cffafe", warning: "#fef3c7", out: "#fee2e2",
};

// ── Dose formatters ────────────────────────────────────────────────────────────
function fmtFlOz(oz: number): string {
  if (oz < 0.5)  return `${(oz * 6).toFixed(0)} tsp`;
  if (oz < 8)    return `${oz.toFixed(1)} fl oz`;
  if (oz < 32)   return `${(oz / 8).toFixed(1)} cups`;
  if (oz < 128)  return `${(oz / 32).toFixed(1)} qt`;
  return `${(oz / 128).toFixed(2)} gal`;
}
function fmtWtOz(oz: number): string {
  if (oz < 1)   return `${(oz * 3).toFixed(0)} tsp`;
  if (oz < 16)  return `${oz.toFixed(1)} oz`;
  const lbs = Math.floor(oz / 16);
  const rem = Math.round(oz % 16);
  return rem < 1 ? `${lbs} lb${lbs > 1 ? "s" : ""}` : `${lbs} lb${lbs > 1 ? "s" : ""} ${rem} oz`;
}
function fmtLbs(lbs: number): string {
  if (lbs < 0.125) return `${(lbs * 16).toFixed(1)} oz`;
  if (lbs < 1)     return `${(lbs * 16).toFixed(0)} oz`;
  const w = Math.floor(lbs);
  const rem = Math.round((lbs - w) * 16);
  return rem < 1 ? `${w} lb${w > 1 ? "s" : ""}` : `${w} lb${w > 1 ? "s" : ""} ${rem} oz`;
}

// ── Smart dose engine ─────────────────────────────────────────────────────────
// All base rates are per 10,000 gallons per unit of correction.
function computeDoses(
  readings: { fc: string; ph: string; alk: string; cya: string },
  poolVolume: number,
  weather: any | null,
  intelligence: any | null,
): DoseItem[] {
  const doses: DoseItem[] = [];
  const V = poolVolume / 10000;

  const uvIndex   = weather?.uvIndex   ?? 0;
  const tempF     = weather?.temp      ?? 75;
  const rain1h    = weather?.rain1h    ?? 0;
  const rainFcast = weather?.rainForecast ?? 0;
  const windSpeed = weather?.windSpeed ?? 0;
  const doseMultiplier = intelligence?.smartDosageMultiplier ?? 1.0;

  // ── FREE CHLORINE ────────────────────────────────────────────────────────────
  const fcVal = parseFloat(readings.fc);
  if (!isNaN(fcVal)) {
    // Dynamic target: hotter/higher UV = higher target to compensate faster burn-off
    let targetFC = 3.5;
    if (uvIndex >= 10 || tempF >= 95) targetFC = 5.0;
    else if (uvIndex >= 7 || tempF >= 90) targetFC = 4.5;
    else if (uvIndex >= 5 || tempF >= 85) targetFC = 4.0;

    const deficit = targetFC - fcVal;

    if (deficit > 0.2) {
      // Liquid chlorine (10% sodium hypochlorite): 13 fl oz per 1 ppm per 10k gal
      const rawOz = deficit * V * 13;
      const adjustedOz = rawOz * doseMultiplier;
      const pctBump = Math.round((doseMultiplier - 1) * 100);

      let weatherNote: string | undefined;
      if (doseMultiplier > 1.05) {
        const reasons: string[] = [];
        if (uvIndex >= 5)   reasons.push(`UV ${uvIndex}`);
        if (tempF >= 85)    reasons.push(`${Math.round(tempF)}°F`);
        if (rain1h >= 2)    reasons.push("recent rain dilution");
        if (rainFcast >= 5) reasons.push("rain incoming");
        weatherNote = `+${pctBump}% for ${reasons.join(" & ")}`;
      } else if (doseMultiplier < 0.95) {
        weatherNote = `${Math.abs(pctBump)}% less — cool/overcast conditions`;
      }

      doses.push({
        chemical:    "Liquid Chlorine (10%)",
        amount:      fmtFlOz(adjustedOz),
        action:      "Add",
        reason:      `Raise FC ${fcVal.toFixed(1)} → ${targetFC.toFixed(1)} ppm`,
        weatherNote,
        urgency:     fcVal < 1 ? "high" : "medium",
      });
    } else if (fcVal > 8) {
      doses.push({
        chemical: "Aerate & Wait",
        amount:   "Do not add chlorine",
        action:   "Hold",
        reason:   `FC ${fcVal.toFixed(1)} ppm is too high — let it off-gas naturally`,
        urgency:  "high",
      });
    }
  }

  // ── ALKALINITY — adjust before pH ────────────────────────────────────────────
  const alkVal = parseFloat(readings.alk);
  if (!isNaN(alkVal)) {
    const targetAlk = 100;
    const alkDelta  = targetAlk - alkVal;

    if (alkDelta > 10) {
      // Baking soda: 1.5 lbs per 10 ppm per 10k gal
      doses.push({
        chemical: "Baking Soda (Alk Up)",
        amount:   fmtLbs(alkDelta / 10 * V * 1.5),
        action:   "Add",
        reason:   `Raise TA ${Math.round(alkVal)} → ${targetAlk} ppm — add before pH`,
        urgency:  alkVal < 60 ? "high" : "medium",
      });
    } else if (alkDelta < -25) {
      // Muriatic acid also lowers TA: ~26 fl oz per 10 ppm per 10k gal
      doses.push({
        chemical: "Muriatic Acid (Alk Down)",
        amount:   fmtFlOz(Math.abs(alkDelta) / 10 * V * 26),
        action:   "Add",
        reason:   `Lower TA ${Math.round(alkVal)} → ${targetAlk} ppm`,
        urgency:  "medium",
        weatherNote: windSpeed >= 20 ? "Add slowly — high wind, splash risk" : undefined,
      });
    }
  }

  // ── pH ────────────────────────────────────────────────────────────────────────
  const phVal = parseFloat(readings.ph);
  if (!isNaN(phVal)) {
    const targetPh = 7.5;
    const phDelta  = targetPh - phVal;

    if (phDelta > 0.1) {
      // Reduce soda ash if significant rain is coming — rain is slightly acidic and will lower pH
      let rainFactor = 1.0;
      let weatherNote: string | undefined;
      if (rainFcast >= 12) {
        rainFactor  = 0.5;
        weatherNote = `Dose cut 50% — heavy rain forecast will lower pH naturally`;
      } else if (rainFcast >= 5) {
        rainFactor  = 0.75;
        weatherNote = `Dose cut 25% — rain incoming may lower pH`;
      }
      // Soda ash: 6 oz per 0.1 pH per 10k gal
      doses.push({
        chemical:    "Soda Ash (pH Up)",
        amount:      fmtWtOz(phDelta * 10 * V * 6 * rainFactor),
        action:      rainFactor < 1 ? "Add" : "Add",
        reason:      `Raise pH ${phVal.toFixed(1)} → ${targetPh.toFixed(1)}`,
        weatherNote,
        urgency:     phVal < 7.0 ? "high" : "medium",
      });
    } else if (phDelta < -0.1) {
      // Muriatic acid: 10 fl oz per 0.1 pH per 10k gal
      doses.push({
        chemical:    "Muriatic Acid (pH Down)",
        amount:      fmtFlOz(Math.abs(phDelta) * 10 * V * 10),
        action:      "Add",
        reason:      `Lower pH ${phVal.toFixed(1)} → ${targetPh.toFixed(1)}`,
        urgency:     phVal > 8.0 ? "high" : "medium",
        weatherNote: windSpeed >= 20 ? "Add slowly near return jets — high wind" : undefined,
      });
    }
  }

  // ── CYA (Stabilizer) ─────────────────────────────────────────────────────────
  const cyaVal = parseFloat(readings.cya);
  if (!isNaN(cyaVal)) {
    const targetCya = uvIndex >= 7 ? 50 : 40; // higher CYA target in high UV
    const cyaDelta  = targetCya - cyaVal;

    if (cyaDelta > 10) {
      // Granular stabilizer: 1.3 lbs per 10 ppm per 10k gal
      doses.push({
        chemical:    "Stabilizer / CYA",
        amount:      fmtLbs(cyaDelta / 10 * V * 1.3),
        action:      "Add",
        reason:      `Raise CYA ${Math.round(cyaVal)} → ${targetCya} ppm`,
        weatherNote: uvIndex >= 7 ? `Higher target (${targetCya} ppm) for UV ${uvIndex} conditions` : undefined,
        urgency:     cyaVal < 20 && uvIndex >= 5 ? "high" : "low",
      });
    } else if (cyaVal > 80) {
      doses.push({
        chemical: "Partial Drain & Refill",
        amount:   "Drain ~20% of pool",
        action:   "Reduce",
        reason:   `CYA ${Math.round(cyaVal)} ppm — too high, chlorine loses effectiveness`,
        urgency:  "medium",
      });
    }
  }

  // Sort: high urgency first
  const order = { high: 0, medium: 1, low: 2, hold: 3 };
  return doses.sort((a, b) => order[a.urgency] - order[b.urgency]);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusPill({ level }: { level: Level }) {
  return (
    <View style={[styles.pill, { backgroundColor: LEVEL_BG[level] }]}>
      <Text style={[styles.pillText, { color: LEVEL_COLORS[level] }]}>{LEVEL_LABELS[level]}</Text>
    </View>
  );
}

const URGENCY_COLORS = { high: "#dc2626", medium: "#d97706", low: "#059669", hold: "#6b7280" };
const URGENCY_BG     = { high: "#fee2e2", medium: "#fef3c7", low: "#d1fae5", hold: "#f3f4f6" };
const ACTION_EMOJI   = { Add: "➕", Reduce: "⬇️", Hold: "⏸" };

function DoseCard({ dose }: { dose: DoseItem }) {
  return (
    <View style={[styles.doseCard, { borderLeftColor: URGENCY_COLORS[dose.urgency] }]}>
      <View style={styles.doseHeader}>
        <Text style={styles.doseChemical}>{dose.chemical}</Text>
        <View style={[styles.doseAmtBadge, { backgroundColor: URGENCY_BG[dose.urgency] }]}>
          <Text style={[styles.doseAmtText, { color: URGENCY_COLORS[dose.urgency] }]}>
            {ACTION_EMOJI[dose.action]}  {dose.amount}
          </Text>
        </View>
      </View>
      <Text style={styles.doseReason}>{dose.reason}</Text>
      {dose.weatherNote && (
        <View style={styles.doseWeatherNote}>
          <Text style={styles.doseWeatherIcon}>🌤</Text>
          <Text style={styles.doseWeatherText}>{dose.weatherNote}</Text>
        </View>
      )}
    </View>
  );
}

const RISK_COLORS = { low: "#059669", medium: "#d97706", high: "#dc2626", critical: "#991b1b" };
const RISK_BG     = { low: "#d1fae5", medium: "#fef3c7", high: "#fee2e2", critical: "#fee2e2" };
const RISK_LABELS = { low: "Low Risk", medium: "Monitor", high: "Action Needed", critical: "CRITICAL" };

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChemistryScreen() {
  const company = useStore((s) => s.company);
  const analyze = useAnalyzeChemistry();
  const { data: poolsData } = usePools();

  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [fc,    setFc]    = useState("");
  const [ph,    setPh]    = useState("");
  const [alk,   setAlk]   = useState("");
  const [cya,   setCya]   = useState("");
  const [sal,   setSal]   = useState("");
  const [result,    setResult]    = useState<string | null>(null);
  const [scanning,  setScanning]  = useState(false);

  const pools = poolsData?.pools ?? [];
  const selectedPool = pools.find((p: any) => p.id === selectedPoolId);

  // Fetch weather when pool is selected (using pool address)
  const { data: weatherData, isLoading: weatherLoading } = useWeather(
    selectedPool?.address,
    selectedPool?.volumeGallons ?? 15000,
    fc ? parseFloat(fc) : undefined,
    cya ? parseFloat(cya) : undefined,
  );

  const weather      = weatherData?.weather      ?? null;
  const intelligence = weatherData?.intelligence ?? null;
  const poolVolume   = selectedPool?.volumeGallons ?? 15000;

  // ── Computed levels ──────────────────────────────────────────────────────────
  const fcVal  = parseFloat(fc);
  const phVal  = parseFloat(ph);
  const alkVal = parseFloat(alk);

  const fcLevel  = fc  ? getFCLevel(fcVal)   : null;
  const phLevel  = ph  ? getPHLevel(phVal)   : null;
  const alkLevel = alk ? getAlkLevel(alkVal) : null;

  const overallOut  = [fcLevel, phLevel, alkLevel].some((l) => l === "out");
  const overallWarn = !overallOut && [fcLevel, phLevel, alkLevel].some((l) => l === "warning");

  // ── Smart doses (computed live) ──────────────────────────────────────────────
  const hasReadings = fc || ph || alk || cya;
  const doses = useMemo(() => {
    if (!hasReadings) return [];
    return computeDoses({ fc, ph, alk, cya }, poolVolume, weather, intelligence);
  }, [fc, ph, alk, cya, poolVolume, weather, intelligence]);

  // ── Scan strip ───────────────────────────────────────────────────────────────
  const scanTestStrip = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        Alert.alert("Permission denied", "Camera or photo library access is needed.");
        return;
      }
    }
    const picked = perm.granted
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });

    if (picked.canceled || !picked.assets?.[0]?.base64) return;

    setScanning(true);
    try {
      const res = await api.post<{
        readings?: { freeChlorine?: number; ph?: number; totalAlkalinity?: number; cyanuricAcid?: number };
      }>("/api/chemistry/read-photo", {
        imageBase64: picked.assets[0].base64,
        companyId:   company?.id,
      });
      const r = res.readings ?? (res as any);
      if (r.freeChlorine    != null) setFc(String(r.freeChlorine));
      if (r.ph              != null) setPh(String(r.ph));
      if (r.totalAlkalinity != null) setAlk(String(r.totalAlkalinity));
      if (r.cyanuricAcid    != null) setCya(String(r.cyanuricAcid));
      Alert.alert("Scan complete", "Values auto-filled. Review before proceeding.");
    } catch (err: any) {
      Alert.alert("Scan failed", err.message ?? "Could not read test strip. Enter manually.");
    } finally {
      setScanning(false);
    }
  };

  // ── AI analysis ───────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!fc && !ph && !alk) {
      Alert.alert("Enter readings", "Please enter at least one chemistry value.");
      return;
    }
    try {
      const res = await analyze.mutateAsync({
        companyId:       company?.id,
        freeChlorine:    fc  ? fcVal  : null,
        ph:              ph  ? phVal  : null,
        totalAlkalinity: alk ? alkVal : null,
        cyanuricAcid:    cya ? parseFloat(cya) : null,
        salt:            sal ? parseFloat(sal) : null,
        volumeGallons:   poolVolume,
        weather,
        intelligence,
      }) as any;
      setResult(res?.analysis ?? res?.recommendation ?? res?.message ?? "Analysis complete.");
    } catch (err: any) {
      Alert.alert("Analysis failed", err.message ?? "Could not reach AI service.");
    }
  };

  const riskLevel = intelligence?.riskLevel as keyof typeof RISK_COLORS | undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Water Chemistry</Text>
        </View>

        {/* Pool selector */}
        {pools.length > 0 && (
          <View style={styles.poolSection}>
            <Text style={styles.poolSectionLabel}>Pool</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pools.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.poolChip, selectedPoolId === p.id && styles.poolChipActive]}
                  onPress={() => setSelectedPoolId(p.id)}
                >
                  <Text style={[styles.poolChipText, selectedPoolId === p.id && styles.poolChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Weather strip */}
        {selectedPool && (
          <View style={styles.weatherCard}>
            {weatherLoading ? (
              <View style={styles.weatherLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.weatherLoadingText}>Loading weather for {selectedPool.address?.split(",")[0]}…</Text>
              </View>
            ) : weather ? (
              <>
                <View style={styles.weatherRow}>
                  <View style={styles.weatherMain}>
                    <Text style={styles.weatherEmoji}>
                      {weather.condition === "Clear" ? "☀️"
                        : weather.condition === "Rain" || weather.condition === "Showers" ? "🌧"
                        : weather.condition === "Thunderstorm" ? "⛈"
                        : "⛅"}
                    </Text>
                    <View>
                      <Text style={styles.weatherTemp}>{weather.temp}°F</Text>
                      <Text style={styles.weatherCond}>{weather.condition}</Text>
                    </View>
                  </View>
                  <View style={styles.weatherStats}>
                    <View style={[styles.uvBadge, { backgroundColor: weather.uvIndex >= 8 ? "#fee2e2" : weather.uvIndex >= 5 ? "#fef3c7" : "#d1fae5" }]}>
                      <Text style={[styles.uvText, { color: weather.uvIndex >= 8 ? "#dc2626" : weather.uvIndex >= 5 ? "#d97706" : "#059669" }]}>
                        UV {weather.uvIndex}
                      </Text>
                    </View>
                    {weather.rainForecast > 0 && (
                      <View style={styles.rainBadge}>
                        <Text style={styles.rainText}>🌧 {weather.rainForecast}mm forecast</Text>
                      </View>
                    )}
                    {weather.rain1h >= 2 && (
                      <View style={[styles.rainBadge, { backgroundColor: "#fee2e2" }]}>
                        <Text style={[styles.rainText, { color: "#dc2626" }]}>⚠️ Rain recently</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Risk level */}
                {riskLevel && riskLevel !== "low" && (
                  <View style={[styles.riskBar, { backgroundColor: RISK_BG[riskLevel] }]}>
                    <Text style={[styles.riskText, { color: RISK_COLORS[riskLevel] }]}>
                      {riskLevel === "critical" ? "⚠️" : "ℹ️"}  {RISK_LABELS[riskLevel]}
                      {intelligence?.riskReasons?.[0] ? ` — ${intelligence.riskReasons[0]}` : ""}
                    </Text>
                  </View>
                )}

                {/* Procedure alerts */}
                {intelligence?.procedureAlerts?.map((alert: any, i: number) => (
                  <View
                    key={i}
                    style={[styles.alertBar, { backgroundColor: alert.urgency === "critical" ? "#fee2e2" : "#fef3c7" }]}
                  >
                    <Text style={[styles.alertText, { color: alert.urgency === "critical" ? "#991b1b" : "#92400e" }]}>
                      {alert.icon}  {alert.message}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.weatherMissing}>
                No weather data — add OPENWEATHER_API_KEY for weather-aware dosing
              </Text>
            )}
          </View>
        )}

        {/* Status banner */}
        {(overallOut || overallWarn) && (
          <View style={[styles.banner, { backgroundColor: overallOut ? "#fee2e2" : "#fef3c7" }]}>
            <Text style={[styles.bannerText, { color: overallOut ? "#dc2626" : "#92400e" }]}>
              {overallOut
                ? "⚠️ One or more readings are OUT OF RANGE"
                : "⚠️ One or more readings need attention"}
            </Text>
          </View>
        )}

        {/* Scan test strip */}
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
          onPress={scanTestStrip}
          disabled={scanning}
        >
          {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.scanBtnEmoji}>📷</Text>}
          <Text style={styles.scanBtnText}>
            {scanning ? "  Scanning with Claude Vision…" : "  Scan Test Strip (Auto-fill)"}
          </Text>
        </TouchableOpacity>

        {/* Readings */}
        <Text style={styles.sectionLabel}>Enter Readings</Text>

        {[
          { label: "Free Chlorine",    unit: "ppm", value: fc,  setter: setFc,  level: fcLevel,  optRange: "3.0–5.0",   placeholder: "3.5" },
          { label: "pH",               unit: "",    value: ph,  setter: setPh,  level: phLevel,  optRange: "7.4–7.6",   placeholder: "7.5" },
          { label: "Total Alkalinity", unit: "ppm", value: alk, setter: setAlk, level: alkLevel, optRange: "80–120",    placeholder: "100" },
          { label: "CYA (Stabilizer)", unit: "ppm", value: cya, setter: setCya, level: null,     optRange: "30–50",     placeholder: "40"  },
          { label: "Salt (SWG)",       unit: "ppm", value: sal, setter: setSal, level: null,     optRange: "2700–3400", placeholder: "3200"},
        ].map(({ label, unit, value, setter, level, optRange, placeholder }) => (
          <View key={label} style={styles.inputRow}>
            <View style={styles.inputLeft}>
              <Text style={styles.inputLabel}>{label}</Text>
              <Text style={styles.inputHint}>Optimal: {optRange} {unit}</Text>
            </View>
            <View style={styles.inputRight}>
              <TextInput
                style={[
                  styles.input,
                  level === "warning" && styles.inputWarn,
                  level === "out"     && styles.inputOut,
                ]}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
              {level && <StatusPill level={level} />}
            </View>
          </View>
        ))}

        {/* ── Smart Dose section ──────────────────────────────────────────────── */}
        {doses.length > 0 && (
          <>
            <View style={styles.doseSectionHeader}>
              <Text style={styles.doseSectionTitle}>Smart Dose Calculator</Text>
              {selectedPool && (
                <Text style={styles.doseSectionSub}>
                  {(poolVolume / 1000).toFixed(0)}k gal pool
                  {weather ? ` · ${weather.temp}°F · UV ${weather.uvIndex}` : ""}
                </Text>
              )}
            </View>

            {weather && intelligence && intelligence.smartDosageMultiplier !== 1.0 && (
              <View style={styles.doseMultiplierBanner}>
                <Text style={styles.doseMultiplierText}>
                  🌤  Doses weather-adjusted ×{intelligence.smartDosageMultiplier} for current conditions
                </Text>
              </View>
            )}

            {doses.map((dose, i) => (
              <View key={i}>
                <DoseCard dose={dose} />
                {dose.action === "Add" && (
                  <ChemicalShopCard chemicalName={dose.chemical} />
                )}
              </View>
            ))}

            {/* Chemical order reminder */}
            <View style={styles.orderTip}>
              <Text style={styles.orderTipTitle}>Application Order</Text>
              <Text style={styles.orderTipText}>
                1. Alkalinity  →  2. pH  →  3. Chlorine  →  4. Stabilizer{"\n"}
                Wait 15–30 min between each. Run pump while adding.
              </Text>
            </View>
          </>
        )}

        {/* ── AI Analysis ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.analyzeBtn, analyze.isPending && styles.analyzeBtnDisabled]}
          onPress={runAnalysis}
          disabled={analyze.isPending}
        >
          <Text style={styles.analyzeBtnText}>
            {analyze.isPending
              ? "Analyzing…"
              : weather
                ? "🤖  AI Analysis (weather-aware)"
                : "🤖  AI Analysis & Recommendations"}
          </Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>AI Recommendation</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  content:      { padding: 16, paddingBottom: 40 },
  header:       { paddingTop: 56, marginBottom: 16 },
  backBtn:      { marginBottom: 8 },
  backText:     { color: COLORS.primary, fontSize: FONTS.base, fontWeight: "600" },
  title:        { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },

  // Pool selector
  poolSection:        { marginBottom: 12 },
  poolSectionLabel:   { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  poolChip:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  poolChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  poolChipText:       { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  poolChipTextActive: { color: "#fff" },

  // Weather card
  weatherCard:         { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  weatherLoading:      { flexDirection: "row", alignItems: "center", gap: 8 },
  weatherLoadingText:  { fontSize: FONTS.sm, color: COLORS.textSecond },
  weatherMissing:      { fontSize: 12, color: COLORS.textLight, fontStyle: "italic" },
  weatherRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  weatherMain:         { flexDirection: "row", alignItems: "center", gap: 10 },
  weatherEmoji:        { fontSize: 32 },
  weatherTemp:         { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  weatherCond:         { fontSize: FONTS.sm, color: COLORS.textSecond },
  weatherStats:        { alignItems: "flex-end", gap: 4 },
  uvBadge:             { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  uvText:              { fontSize: 12, fontWeight: "700" },
  rainBadge:           { backgroundColor: "#dbeafe", borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  rainText:            { fontSize: 11, fontWeight: "600", color: "#1e40af" },
  riskBar:             { borderRadius: RADIUS.sm, padding: 8, marginTop: 4 },
  riskText:            { fontSize: FONTS.sm, fontWeight: "600" },
  alertBar:            { borderRadius: RADIUS.sm, padding: 8, marginTop: 4 },
  alertText:           { fontSize: 12, fontWeight: "600", lineHeight: 17 },

  // Status banner
  banner:       { borderRadius: RADIUS.md, padding: 12, marginBottom: 16 },
  bannerText:   { fontSize: FONTS.sm, fontWeight: "600" },

  // Scan
  scanBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: 14, marginBottom: 20 },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnEmoji:    { fontSize: 18 },
  scanBtnText:     { color: "#fff", fontWeight: "700", fontSize: FONTS.base },

  // Inputs
  sectionLabel:  { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow:      { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, marginBottom: 8, gap: 12 },
  inputLeft:     { flex: 1 },
  inputLabel:    { fontSize: FONTS.base, fontWeight: "600", color: COLORS.text },
  inputHint:     { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  inputRight:    { alignItems: "flex-end", gap: 4 },
  input:         { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: 10, fontSize: FONTS.base, color: COLORS.text, width: 80, textAlign: "center", borderWidth: 1, borderColor: COLORS.border },
  inputWarn:     { borderColor: "#d97706", backgroundColor: "#fefce8" },
  inputOut:      { borderColor: "#dc2626", backgroundColor: "#fef2f2" },
  pill:          { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText:      { fontSize: 10, fontWeight: "700" },

  // Dose section
  doseSectionHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24, marginBottom: 4 },
  doseSectionTitle:   { fontSize: FONTS.base, fontWeight: "800", color: COLORS.text },
  doseSectionSub:     { fontSize: 11, color: COLORS.textSecond },
  doseMultiplierBanner: { backgroundColor: "#eff6ff", borderRadius: RADIUS.sm, padding: 8, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: COLORS.primary },
  doseMultiplierText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  doseCard:           { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, marginBottom: 8, borderLeftWidth: 3 },
  doseHeader:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  doseChemical:       { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.text, flex: 1, marginRight: 8 },
  doseAmtBadge:       { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  doseAmtText:        { fontSize: FONTS.sm, fontWeight: "800" },
  doseReason:         { fontSize: 12, color: COLORS.textSecond },
  doseWeatherNote:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  doseWeatherIcon:    { fontSize: 12 },
  doseWeatherText:    { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  orderTip:           { backgroundColor: "#f0fdf4", borderRadius: RADIUS.md, padding: 12, marginTop: 4, marginBottom: 16 },
  orderTipTitle:      { fontSize: FONTS.sm, fontWeight: "700", color: "#15803d", marginBottom: 4 },
  orderTipText:       { fontSize: 12, color: "#166534", lineHeight: 18 },

  // AI
  analyzeBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 8 },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeBtnText:     { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
  resultCard:         { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, marginTop: 16, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  resultTitle:        { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  resultText:         { fontSize: FONTS.base, color: COLORS.text, lineHeight: 22 },
});
