import { useState, useRef } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Switch, TextInput, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useStore } from "../src/lib/store";
import { usePools, useCreateReport } from "../src/hooks/useData";
import { api } from "../src/lib/api";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stoplight {
  name:     string;
  value:    number | null;
  unit:     string;
  status:   "good" | "low" | "high" | "critical" | "untested";
  emoji:    string;
  headline: string;
  message:  string;
}

interface ChemAction {
  chemical: string;
  emoji:    string;
  urgency:  "high" | "medium" | "low";
  amount:   string;
  why:      string;
  howTo:    string[];
  safety:   string;
}

interface AIAnalysis {
  overallMessage: string;
  allGood:        boolean;
  stoplights:     Stoplight[];
  actions:        ChemAction[];
}

// ── Suggested questions per step ──────────────────────────────────────────────
const STEP_QUESTIONS: Record<number, string[]> = {
  0:  ["How do I use GPS check-in?", "What if my pool isn't on the list?"],
  1:  ["What safety hazards should I look for?", "What does a damaged drain cover look like?"],
  2:  ["How do I hold the skimmer net?", "What debris is OK to leave?"],
  3:  ["How hard should I brush?", "Where do I brush first?"],
  4:  ["How slow should I vacuum?", "What if I see algae on the floor?"],
  5:  ["Where are the skimmer baskets?", "How do I open the pump basket?"],
  6:  ["How do I backwash a sand filter?", "How do I clean a cartridge filter?"],
  7:  ["How do I use a test strip?", "What if my readings look off?", "Why do we test the water?"],
  8:  ["Is it dangerous to add chemicals?", "What order do I add chemicals?", "Can I mix chemicals?"],
  9:  ["What does a healthy pump sound like?", "What is a salt cell?"],
  10: ["What should I write in my notes?", "What if I forgot a step?"],
};

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1,  emoji: "📍", title: "Arrive & Check In",        subtitle: "Log GPS location for verified visit proof" },
  { id: 2,  emoji: "🦺", title: "Safety Check",             subtitle: "Inspect gate, fencing, drain covers" },
  { id: 3,  emoji: "🍃", title: "Skim Surface",             subtitle: "Remove leaves & debris from water surface" },
  { id: 4,  emoji: "🧹", title: "Brush Walls & Floor",      subtitle: "Brush all surfaces toward main drain" },
  { id: 5,  emoji: "🌀", title: "Vacuum Pool",              subtitle: "Vacuum floor and walls thoroughly" },
  { id: 6,  emoji: "🧺", title: "Empty Skimmer Baskets",   subtitle: "Clear skimmer and pump baskets" },
  { id: 7,  emoji: "🔄", title: "Clean Filter",            subtitle: "Backwash or rinse — check pressure gauge" },
  { id: 8,  emoji: "⚗️", title: "Test Water",              subtitle: "Enter your test kit readings" },
  { id: 9,  emoji: "🧪", title: "Add Chemicals",           subtitle: "Follow the AI guide — one step at a time" },
  { id: 10, emoji: "🔧", title: "Equipment Check",         subtitle: "Pump, heater, salt cell — listen and inspect" },
  { id: 11, emoji: "✅", title: "Done! Submit Report",      subtitle: "Final notes & submit your service report" },
];

const URGENCY_COLORS = { high: "#dc2626", medium: "#d97706", low: "#059669" };
const URGENCY_BG     = { high: "#fee2e2", medium: "#fef3c7", low: "#d1fae5" };
const STATUS_COLORS  = { good: "#059669", low: "#d97706", high: "#d97706", critical: "#dc2626", untested: "#9ca3af" };
const STATUS_BG      = { good: "#d1fae5", low: "#fef3c7", high: "#fef3c7", critical: "#fee2e2", untested: "#f3f4f6" };

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ServiceFlowScreen() {
  const company      = useStore((s) => s.company);
  const user         = useStore((s) => s.user);
  const { data: poolsData } = usePools();
  const createReport = useCreateReport();

  const [currentStep, setCurrentStep]   = useState(0);
  const [completed,   setCompleted]     = useState<Set<number>>(new Set());
  const [poolId,      setPoolId]        = useState<number | null>(null);
  const [checkedIn,   setCheckedIn]     = useState(false);
  const [gpsCoords,   setGpsCoords]     = useState<{ lat: number; lng: number } | null>(null);

  // Cleaning toggles
  const [safetyOk,  setSafetyOk]   = useState(true);
  const [safetyNote,setSafetyNote] = useState("");
  const [skimmed,   setSkimmed]    = useState(false);
  const [brushed,   setBrushed]    = useState(false);
  const [vacuumed,  setVacuumed]   = useState(false);
  const [baskets,   setBaskets]    = useState(false);
  const [backwash,  setBackwash]   = useState(false);

  // Chemistry
  const [fc,  setFc]  = useState("");
  const [ph,  setPh]  = useState("");
  const [alk, setAlk] = useState("");
  const [cya, setCya] = useState("");

  // AI analysis state
  const [aiAnalysis,   setAiAnalysis]   = useState<AIAnalysis | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [chemStep,     setChemStep]     = useState(0); // which action are we on in the wizard

  // Equipment
  const [pumpOk,   setPumpOk]   = useState(true);
  const [heaterOk, setHeaterOk] = useState(true);
  const [eqNotes,  setEqNotes]  = useState("");

  // Final
  const [finalNotes, setFinalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI Chat modal
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatInput,   setChatInput]   = useState("");
  const [chatAnswer,  setChatAnswer]  = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);

  const pools = poolsData?.pools ?? [];
  const step  = STEPS[currentStep];
  const total = STEPS.length;

  const pool = pools.find((p: any) => p.id === poolId);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const checkIn = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location access is needed to log verified visits.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setCheckedIn(true);
  };

  const markDone = () => {
    setCompleted((prev) => new Set([...prev, currentStep]));
    if (currentStep < total - 1) setCurrentStep((s) => s + 1);
  };

  const analyzeWater = async () => {
    if (!fc && !ph && !alk) {
      Alert.alert("Enter readings", "Enter at least one reading before analyzing.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await api.post<AIAnalysis>("/api/employee-guide", {
        type:       "analyze",
        readings:   {
          fc:  fc  ? parseFloat(fc)  : undefined,
          ph:  ph  ? parseFloat(ph)  : undefined,
          alk: alk ? parseFloat(alk) : undefined,
          cya: cya ? parseFloat(cya) : undefined,
        },
        poolVolume: pool?.volumeGallons ?? 15000,
      });
      setAiAnalysis(result);
      setChemStep(0);
      // Auto-advance to chemicals step
      setCompleted((prev) => new Set([...prev, currentStep]));
      setCurrentStep(8); // step 9 = index 8
    } catch (err: any) {
      Alert.alert("Analysis failed", err.message ?? "Could not reach AI. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const askAI = async (question: string) => {
    if (!question.trim()) return;
    setChatLoading(true);
    setChatAnswer("");
    try {
      const res = await api.post<{ answer: string }>("/api/employee-guide", {
        type:     "ask",
        question: question.trim(),
        context:  step.title,
      });
      setChatAnswer(res.answer);
      setChatHistory((h) => [...h, { q: question.trim(), a: res.answer }]);
      setChatInput("");
    } catch {
      setChatAnswer("Sorry, I couldn't connect right now. Try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const submitReport = async () => {
    if (!poolId) { Alert.alert("Required", "Select a pool first."); return; }
    setSubmitting(true);
    try {
      await createReport.mutateAsync({
        poolId,
        companyId:       company!.id,
        status:          "complete",
        techId:          user?.uid,
        gpsLat:          gpsCoords?.lat ?? null,
        gpsLng:          gpsCoords?.lng ?? null,
        skimmed,
        brushed,
        vacuumed,
        filterCleaned:   backwash,
        chemicalsAdded:  (aiAnalysis?.actions?.length ?? 0) > 0,
        equipmentChecked: true,
        freeChlorine:    fc  ? parseFloat(fc)  : null,
        ph:              ph  ? parseFloat(ph)  : null,
        totalAlkalinity: alk ? parseFloat(alk) : null,
        safetyOk,
        pumpOk,
        heaterOk,
        techNotes: [safetyNote, eqNotes, finalNotes].filter(Boolean).join("\n") || null,
        chemicalsUsed: aiAnalysis?.actions.map((a) => `${a.chemical} — ${a.amount}`).join(", ") || null,
      });
      Alert.alert("Report submitted!", "Great work! Service report saved.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep) {
      // ── Arrive ──────────────────────────────────────────────────────────────
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>
              First, select the pool you're at. Then tap Check In — this records your GPS location as proof you were there.
            </Text>
            <Text style={styles.fieldLabel}>Select Pool</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pools.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, poolId === p.id && styles.chipActive]}
                  onPress={() => setPoolId(p.id)}
                >
                  <Text style={[styles.chipText, poolId === p.id && styles.chipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {checkedIn ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✓ Checked in at {gpsCoords?.lat.toFixed(4)}, {gpsCoords?.lng.toFixed(4)}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={checkIn}>
                <Text style={styles.primaryBtnText}>📍  Check In (GPS)</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ── Safety ───────────────────────────────────────────────────────────────
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Look around before you start. Check the gate latches, fencing, and make sure drain covers are secure and not cracked.</Text>
            <ToggleRow label="All safety checks passed" value={safetyOk} onChange={setSafetyOk} />
            {!safetyOk && (
              <>
                <Text style={styles.fieldLabel}>Describe the issue</Text>
                <TextInput style={styles.textArea} value={safetyNote} onChangeText={setSafetyNote}
                  placeholder="What did you find? (e.g. broken gate latch, cracked drain cover)"
                  placeholderTextColor={COLORS.textLight} multiline numberOfLines={3} />
              </>
            )}
          </View>
        );

      // ── Skim ─────────────────────────────────────────────────────────────────
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Use the long-handled leaf net to scoop everything floating on the surface. Go around the whole pool, including the corners.</Text>
            <InfoTip icon="💡" text="Tip: Skim before brushing so you don't push debris into the water." />
            <ToggleRow label="Surface skimmed ✓" value={skimmed} onChange={setSkimmed} />
          </View>
        );

      // ── Brush ────────────────────────────────────────────────────────────────
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Use the wall brush to scrub all surfaces — walls, steps, and floor. Always brush toward the main drain in the deep end.</Text>
            <InfoTip icon="💡" text="Tip: Brushing breaks up algae before it can grow. Start at the shallow end and work toward the deep end." />
            <ToggleRow label="All walls & floor brushed ✓" value={brushed} onChange={setBrushed} />
          </View>
        );

      // ── Vacuum ───────────────────────────────────────────────────────────────
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Connect the vacuum head to the pole, attach the hose, and prime it in the water. Move in slow, overlapping stripes — like mowing a lawn.</Text>
            <InfoTip icon="⚠️" text="Move slowly! Going too fast just stirs up debris without picking it up." color="#fef3c7" textColor="#92400e" />
            <ToggleRow label="Pool vacuumed ✓" value={vacuumed} onChange={setVacuumed} />
          </View>
        );

      // ── Baskets ──────────────────────────────────────────────────────────────
      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Find the skimmer door(s) in the pool wall and remove the basket inside. Dump it out and rinse it. Then find the pump (usually near the equipment pad) and clean its basket too.</Text>
            <InfoTip icon="💡" text="Clogged baskets reduce water flow and can damage the pump." />
            <ToggleRow label="All baskets emptied ✓" value={baskets} onChange={setBaskets} />
          </View>
        );

      // ── Filter ───────────────────────────────────────────────────────────────
      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>
              Look at the pressure gauge on the filter. If it reads 8–10 PSI above normal, it needs cleaning.{"\n\n"}
              • Sand/DE filter: Turn valve to BACKWASH, run 2 minutes, then RINSE 30 seconds.{"\n"}
              • Cartridge filter: Remove cartridge, rinse with garden hose.
            </Text>
            <InfoTip icon="💡" text="Not sure what filter type this pool has? Ask your supervisor or tap the AI button." />
            <ToggleRow label="Filter cleaned ✓" value={backwash} onChange={setBackwash} />
          </View>
        );

      // ── Test water ───────────────────────────────────────────────────────────
      case 7:
        return (
          <View style={styles.stepContent}>
            {!aiAnalysis ? (
              <>
                <Text style={styles.instruction}>
                  Dip your test strip for 1 second, hold it level for 15 seconds, then match the colors on the bottle. Enter what you see below.
                </Text>
                <InfoTip icon="💡" text="You don't need to enter all of them — just the ones you tested." />
                {[
                  { label: "Free Chlorine",    unit: "ppm", value: fc,  setter: setFc,  range: "Good: 3–5" },
                  { label: "pH",               unit: "",    value: ph,  setter: setPh,  range: "Good: 7.4–7.6" },
                  { label: "Alkalinity",       unit: "ppm", value: alk, setter: setAlk, range: "Good: 80–120" },
                  { label: "Stabilizer (CYA)", unit: "ppm", value: cya, setter: setCya, range: "Good: 30–50" },
                ].map(({ label, unit, value, setter, range }) => (
                  <View key={label} style={styles.readingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.readingLabel}>{label}</Text>
                      <Text style={styles.readingRange}>{range} {unit}</Text>
                    </View>
                    <TextInput
                      style={styles.readingInput}
                      value={value}
                      onChangeText={setter}
                      placeholder="—"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.primaryBtn, aiLoading && styles.btnDisabled]}
                  onPress={analyzeWater}
                  disabled={aiLoading}
                >
                  {aiLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.primaryBtnText}>🤖  Check My Water →</Text>
                  }
                </TouchableOpacity>
                {aiLoading && (
                  <Text style={styles.loadingHint}>AI is analyzing your readings…</Text>
                )}
              </>
            ) : (
              // Show stoplights
              <View style={{ gap: 10 }}>
                <View style={[styles.overallBanner, { backgroundColor: aiAnalysis.allGood ? "#d1fae5" : "#fef3c7" }]}>
                  <Text style={[styles.overallText, { color: aiAnalysis.allGood ? "#065f46" : "#92400e" }]}>
                    {aiAnalysis.allGood ? "✅" : "⚠️"}  {aiAnalysis.overallMessage}
                  </Text>
                </View>
                {aiAnalysis.stoplights.map((sl, i) => (
                  <View key={i} style={[styles.stoplightCard, { backgroundColor: STATUS_BG[sl.status] }]}>
                    <View style={styles.stoplightRow}>
                      <Text style={styles.stoplightEmoji}>{sl.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stoplightHeadline, { color: STATUS_COLORS[sl.status] }]}>
                          {sl.name}: {sl.headline}
                        </Text>
                        <Text style={styles.stoplightMessage}>{sl.message}</Text>
                      </View>
                      {sl.value !== null && (
                        <Text style={[styles.stoplightValue, { color: STATUS_COLORS[sl.status] }]}>
                          {sl.value} {sl.unit}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setAiAnalysis(null); setCurrentStep(7); }}>
                  <Text style={styles.secondaryBtnText}>← Re-enter readings</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      // ── Add chemicals (guided wizard) ────────────────────────────────────────
      case 8:
        if (!aiAnalysis) {
          return (
            <View style={styles.stepContent}>
              <InfoTip icon="ℹ️" text="Go back and test the water first so the AI can tell you exactly what to add." />
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(7)}>
                <Text style={styles.secondaryBtnText}>← Go back to Test Water</Text>
              </TouchableOpacity>
            </View>
          );
        }
        if (aiAnalysis.allGood || aiAnalysis.actions.length === 0) {
          return (
            <View style={styles.stepContent}>
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>🎉 Great news! Your water looks perfect — no chemicals needed today!</Text>
              </View>
            </View>
          );
        }
        {
          const action = aiAnalysis.actions[chemStep];
          const isLast = chemStep >= aiAnalysis.actions.length - 1;
          return (
            <View style={styles.stepContent}>
              {/* Progress within wizard */}
              <View style={styles.wizardProgress}>
                {aiAnalysis.actions.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.wizardDot, i === chemStep && styles.wizardDotActive, i < chemStep && styles.wizardDotDone]}
                  />
                ))}
              </View>
              <Text style={styles.wizardCounter}>Chemical {chemStep + 1} of {aiAnalysis.actions.length}</Text>

              {/* Chemical card */}
              <View style={[styles.chemCard, { borderTopColor: URGENCY_COLORS[action.urgency] }]}>
                <View style={styles.chemCardHeader}>
                  <Text style={styles.chemEmoji}>{action.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chemName}>{action.chemical}</Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_BG[action.urgency] }]}>
                      <Text style={[styles.urgencyText, { color: URGENCY_COLORS[action.urgency] }]}>
                        {action.urgency === "high" ? "⚠️ Do this first" : action.urgency === "medium" ? "Important" : "Optional"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountText}>{action.amount}</Text>
                  </View>
                </View>

                {/* Why */}
                <View style={styles.whyBox}>
                  <Text style={styles.whyText}>💬  {action.why}</Text>
                </View>

                {/* Safety */}
                {action.safety && (
                  <View style={styles.safetyBox}>
                    <Text style={styles.safetyText}>⚠️  {action.safety}</Text>
                  </View>
                )}

                {/* How-to steps */}
                <Text style={styles.howToTitle}>How to add it:</Text>
                {action.howTo.map((step, i) => (
                  <View key={i} style={styles.howToStep}>
                    <View style={styles.howToNum}>
                      <Text style={styles.howToNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.howToText}>{step.replace(/^Step \d+:\s*/i, "")}</Text>
                  </View>
                ))}
              </View>

              {/* Wait reminder */}
              <InfoTip icon="⏱" text="Wait 15 minutes with the pump running before adding the next chemical." color="#eff6ff" textColor="#1e40af" />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  if (isLast) {
                    setCompleted((prev) => new Set([...prev, 8]));
                    setCurrentStep(9);
                  } else {
                    setChemStep((s) => s + 1);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isLast ? "All chemicals added ✓ → Next" : `Done → Next Chemical (${chemStep + 2}/${aiAnalysis.actions.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

      // ── Equipment ────────────────────────────────────────────────────────────
      case 9:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Stand near the equipment pad. Look and listen. The pump should hum steadily — no grinding or rattling. Check for drips or leaks.</Text>
            <ToggleRow label="Pump running normally" value={pumpOk} onChange={setPumpOk} />
            <ToggleRow label="Heater / salt cell OK" value={heaterOk} onChange={setHeaterOk} />
            {(!pumpOk || !heaterOk) && (
              <>
                <Text style={styles.fieldLabel}>Describe the issue</Text>
                <TextInput style={styles.textArea} value={eqNotes} onChangeText={setEqNotes}
                  placeholder="What did you hear or see? (e.g. grinding noise, water leaking from pump)"
                  placeholderTextColor={COLORS.textLight} multiline numberOfLines={3} />
              </>
            )}
          </View>
        );

      // ── Complete ─────────────────────────────────────────────────────────────
      case 10:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instruction}>Almost there! Add any last notes, then submit your report. Your supervisor will see it right away.</Text>
            <Text style={styles.fieldLabel}>Final Notes (optional)</Text>
            <TextInput style={styles.textArea} value={finalNotes} onChangeText={setFinalNotes}
              placeholder="Anything unusual? Pool condition, things the homeowner should know…"
              placeholderTextColor={COLORS.textLight} multiline numberOfLines={4} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📋 Your Summary</Text>
              <SummaryRow label="Pool" value={pool?.name ?? "Not selected"} />
              <SummaryRow label="GPS" value={checkedIn ? "✓ Verified" : "Not logged"} ok={checkedIn} />
              <SummaryRow label="Water" value={aiAnalysis ? aiAnalysis.overallMessage : `FC ${fc || "—"} · pH ${ph || "—"}`} />
              <SummaryRow label="Chemicals" value={aiAnalysis?.actions.length ? `${aiAnalysis.actions.length} added` : "None needed"} />
              <SummaryRow label="Steps done" value={`${completed.size} / ${total}`} />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={submitReport}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>✓  Submit Service Report</Text>
              }
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // ── AI Chat modal ─────────────────────────────────────────────────────────────
  const suggested = STEP_QUESTIONS[currentStep] ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pool Service Guide</Text>
          <Text style={styles.stepCounter}>Step {currentStep + 1} of {total}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((currentStep + 1) / total) * 100}%` as any }]} />
        </View>

        {/* Step dots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dotsScroll}>
          {STEPS.map((s, i) => (
            <TouchableOpacity key={s.id} onPress={() => setCurrentStep(i)} style={styles.dotBtn}>
              <View style={[styles.dot, completed.has(i) && styles.dotDone, i === currentStep && styles.dotActive]}>
                <Text style={[styles.dotText, (completed.has(i) || i === currentStep) && styles.dotTextActive]}>
                  {completed.has(i) ? "✓" : String(s.id)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Step content */}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            </View>
          </View>
          {renderStepContent()}
        </ScrollView>

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnBack, currentStep === 0 && styles.btnDisabled]}
            onPress={() => currentStep > 0 && setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
          >
            <Text style={styles.navBtnBackText}>← Back</Text>
          </TouchableOpacity>
          {currentStep < total - 1 && (
            <TouchableOpacity style={[styles.navBtn, styles.navBtnNext]} onPress={markDone}>
              <Text style={styles.navBtnNextText}>Done · Next →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Floating AI chat button */}
        <TouchableOpacity style={styles.chatFab} onPress={() => { setChatAnswer(""); setChatHistory([]); setChatOpen(true); }}>
          <Text style={styles.chatFabText}>🤖</Text>
          <Text style={styles.chatFabLabel}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* AI Chat modal */}
      <Modal visible={chatOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChatOpen(false)}>
        <View style={styles.chatModal}>
          <View style={styles.chatModalHeader}>
            <Text style={styles.chatModalTitle}>🤖 Ask the AI Guide</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)}>
              <Text style={styles.chatClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.chatContext}>Current step: {step.title}</Text>

          <ScrollView style={styles.chatBody} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {/* History */}
            {chatHistory.map((item, i) => (
              <View key={i}>
                <View style={styles.chatBubbleUser}>
                  <Text style={styles.chatBubbleUserText}>{item.q}</Text>
                </View>
                <View style={styles.chatBubbleAI}>
                  <Text style={styles.chatBubbleAIText}>{item.a}</Text>
                </View>
              </View>
            ))}
            {chatLoading && (
              <View style={styles.chatBubbleAI}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
            {chatAnswer && chatHistory.length === 0 && (
              <View style={styles.chatBubbleAI}>
                <Text style={styles.chatBubbleAIText}>{chatAnswer}</Text>
              </View>
            )}

            {/* Suggested questions */}
            {chatHistory.length === 0 && !chatLoading && (
              <View>
                <Text style={styles.suggestedLabel}>Quick questions for this step:</Text>
                {suggested.map((q, i) => (
                  <TouchableOpacity key={i} style={styles.suggestedChip} onPress={() => askAI(q)}>
                    <Text style={styles.suggestedText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask anything…"
                placeholderTextColor={COLORS.textLight}
                returnKeyType="send"
                onSubmitEditing={() => askAI(chatInput)}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, (!chatInput.trim() || chatLoading) && styles.btnDisabled]}
                onPress={() => askAI(chatInput)}
                disabled={!chatInput.trim() || chatLoading}
              >
                <Text style={styles.chatSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: COLORS.primary }} thumbColor="#fff" />
    </View>
  );
}

function InfoTip({ icon, text, color = "#f0fdf4", textColor = "#166534" }: { icon: string; text: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.tip, { backgroundColor: color }]}>
      <Text style={styles.tipIcon}>{icon}</Text>
      <Text style={[styles.tipText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, ok === false && { color: COLORS.danger }]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.background },
  header:            { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backText:          { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 4 },
  title:             { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  stepCounter:       { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  progressTrack:     { height: 4, backgroundColor: COLORS.borderLight, marginHorizontal: 16, borderRadius: 2, marginTop: 8 },
  progressFill:      { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  dotsScroll:        { maxHeight: 56, paddingHorizontal: 12, marginTop: 8 },
  dotBtn:            { paddingHorizontal: 4 },
  dot:               { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.borderLight, alignItems: "center", justifyContent: "center" },
  dotActive:         { backgroundColor: COLORS.primary },
  dotDone:           { backgroundColor: "#059669" },
  dotText:           { fontSize: 11, fontWeight: "700", color: COLORS.textSecond },
  dotTextActive:     { color: "#fff" },
  content:           { padding: 16, paddingBottom: 100 },
  stepHeader:        { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, marginBottom: 16 },
  stepEmoji:         { fontSize: 36 },
  stepTitle:         { fontSize: FONTS.lg, fontWeight: "800", color: COLORS.text },
  stepSubtitle:      { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 3 },
  stepContent:       { gap: 12 },
  instruction:       { fontSize: FONTS.base, color: COLORS.textSecond, lineHeight: 24, backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14 },
  fieldLabel:        { fontSize: 11, fontWeight: "700", color: COLORS.textSecond, textTransform: "uppercase", letterSpacing: 0.5 },
  chip:              { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: "#fff" },
  chipActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:          { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive:    { color: "#fff" },
  primaryBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center" },
  primaryBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  secondaryBtn:      { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, alignItems: "center", backgroundColor: "#fff" },
  secondaryBtnText:  { color: COLORS.textSecond, fontWeight: "600", fontSize: FONTS.base },
  submitBtn:         { backgroundColor: "#059669", borderRadius: RADIUS.md, padding: 16, alignItems: "center" },
  submitBtnText:     { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  btnDisabled:       { opacity: 0.5 },
  successBanner:     { backgroundColor: "#d1fae5", borderRadius: RADIUS.md, padding: 14 },
  successBannerText: { color: "#065f46", fontWeight: "600", fontSize: FONTS.sm, lineHeight: 20 },
  textArea:          { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text, textAlignVertical: "top", minHeight: 80, borderWidth: 1, borderColor: COLORS.border },
  toggleRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  toggleLabel:       { fontSize: FONTS.base, color: COLORS.text, flex: 1, fontWeight: "600" },
  tip:               { flexDirection: "row", gap: 8, borderRadius: RADIUS.md, padding: 12, alignItems: "flex-start" },
  tipIcon:           { fontSize: 16 },
  tipText:           { flex: 1, fontSize: FONTS.sm, lineHeight: 18, fontWeight: "500" },

  // Reading inputs
  readingRow:        { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  readingLabel:      { fontSize: FONTS.base, fontWeight: "600", color: COLORS.text },
  readingRange:      { fontSize: 11, color: COLORS.textSecond, marginTop: 2 },
  readingInput:      { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: 10, fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text, width: 80, textAlign: "center", borderWidth: 1, borderColor: COLORS.border },
  loadingHint:       { textAlign: "center", fontSize: FONTS.sm, color: COLORS.textSecond, fontStyle: "italic" },

  // Stoplights
  overallBanner:     { borderRadius: RADIUS.md, padding: 14 },
  overallText:       { fontSize: FONTS.base, fontWeight: "700", lineHeight: 20 },
  stoplightCard:     { borderRadius: RADIUS.md, padding: 14 },
  stoplightRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stoplightEmoji:    { fontSize: 24 },
  stoplightHeadline: { fontSize: FONTS.base, fontWeight: "800" },
  stoplightMessage:  { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2, lineHeight: 18 },
  stoplightValue:    { fontSize: FONTS.lg, fontWeight: "800" },

  // Chemical wizard
  wizardProgress:    { flexDirection: "row", gap: 6, justifyContent: "center" },
  wizardDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.borderLight },
  wizardDotActive:   { backgroundColor: COLORS.primary, width: 24 },
  wizardDotDone:     { backgroundColor: "#059669" },
  wizardCounter:     { textAlign: "center", fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chemCard:          { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, borderTopWidth: 4, borderWidth: 1, borderColor: COLORS.border },
  chemCardHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  chemEmoji:         { fontSize: 36 },
  chemName:          { fontSize: FONTS.lg, fontWeight: "800", color: COLORS.text, flex: 1 },
  urgencyBadge:      { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginTop: 4 },
  urgencyText:       { fontSize: 11, fontWeight: "700" },
  amountBox:         { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 10, alignItems: "center", minWidth: 80, borderWidth: 1, borderColor: COLORS.border },
  amountText:        { fontSize: FONTS.sm, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  whyBox:            { backgroundColor: "#f0fdf4", borderRadius: RADIUS.sm, padding: 10, marginBottom: 10 },
  whyText:           { fontSize: FONTS.sm, color: "#166534", lineHeight: 18 },
  safetyBox:         { backgroundColor: "#fef3c7", borderRadius: RADIUS.sm, padding: 10, marginBottom: 10 },
  safetyText:        { fontSize: FONTS.sm, color: "#92400e", fontWeight: "600", lineHeight: 18 },
  howToTitle:        { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  howToStep:         { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  howToNum:          { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  howToNumText:      { color: "#fff", fontSize: 12, fontWeight: "800" },
  howToText:         { flex: 1, fontSize: FONTS.base, color: COLORS.text, lineHeight: 21 },

  // Summary
  summaryCard:       { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  summaryTitle:      { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow:        { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel:      { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  summaryValue:      { fontSize: FONTS.sm, color: COLORS.text, fontWeight: "600", flex: 1, textAlign: "right" },

  // Bottom nav
  bottomNav:         { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  navBtn:            { flex: 1, borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  navBtnBack:        { borderWidth: 1, borderColor: COLORS.border },
  navBtnNext:        { backgroundColor: COLORS.primary },
  navBtnBackText:    { color: COLORS.textSecond, fontWeight: "600" },
  navBtnNextText:    { color: "#fff", fontWeight: "700" },

  // Floating AI button
  chatFab:           { position: "absolute", bottom: 88, right: 16, backgroundColor: "#7c3aed", borderRadius: 30, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  chatFabText:       { fontSize: 20 },
  chatFabLabel:      { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },

  // Chat modal
  chatModal:         { flex: 1, backgroundColor: COLORS.background },
  chatModalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chatModalTitle:    { fontSize: FONTS.lg, fontWeight: "800", color: COLORS.text },
  chatClose:         { fontSize: 20, color: COLORS.textSecond, padding: 4 },
  chatContext:       { fontSize: 12, color: COLORS.textSecond, paddingHorizontal: 16, paddingTop: 8, fontStyle: "italic" },
  chatBody:          { flex: 1 },
  chatBubbleUser:    { backgroundColor: COLORS.primary, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, alignSelf: "flex-end", maxWidth: "80%", marginBottom: 8 },
  chatBubbleUserText:{ color: "#fff", fontSize: FONTS.base, lineHeight: 20 },
  chatBubbleAI:      { backgroundColor: "#f3f4f6", borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, alignSelf: "flex-start", maxWidth: "85%", marginBottom: 8 },
  chatBubbleAIText:  { color: COLORS.text, fontSize: FONTS.base, lineHeight: 22 },
  suggestedLabel:    { fontSize: 12, fontWeight: "700", color: COLORS.textSecond, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  suggestedChip:     { backgroundColor: "#eff6ff", borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8, borderWidth: 1, borderColor: "#bfdbfe" },
  suggestedText:     { fontSize: FONTS.sm, color: "#1d4ed8", fontWeight: "600" },
  chatInputRow:      { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  chatInput:         { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: FONTS.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  chatSendBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  chatSendText:      { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
});
