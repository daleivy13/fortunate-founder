import { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Audio } from "expo-av";
import { api } from "../src/lib/api";
import { useStore } from "../src/lib/store";
import { usePools, useCreateReport } from "../src/hooks/useData";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

type Mode = "idle" | "recording" | "processing" | "done";

interface Transcript {
  text:       string;
  poolId?:    number;
  action?:    "service_notes" | "chemistry" | "damage" | "general";
  extracted?: Record<string, any>;
}

export default function VoiceScreen() {
  const company      = useStore((s) => s.company);
  const user         = useStore((s) => s.user);
  const idToken      = useStore((s) => s.idToken);
  const { data: poolsData } = usePools();
  const createReport = useCreateReport();

  const [mode,       setMode]       = useState<Mode>("idle");
  const [duration,   setDuration]   = useState(0);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [poolId,     setPoolId]     = useState<number | null>(null);

  const recordingRef  = useRef<Audio.Recording | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const pools = poolsData?.pools ?? [];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission denied", "Microphone access is required for voice notes.");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS:       true,
      playsInSilentModeIOS:     true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setMode("recording");
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recordingRef.current) return;

    setMode("processing");

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No recording URI");

      // Upload to backend which proxies to OpenAI Whisper
      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      } as any);
      if (poolId)       formData.append("poolId",    String(poolId));
      if (company?.id)  formData.append("companyId", String(company.id));

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "https://poolpalai.com"}/api/voice/transcribe`,
        {
          method:  "POST",
          headers: { Authorization: `Bearer ${idToken ?? ""}` },
          body:    formData,
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setTranscript({
        text:      data.transcript ?? "",
        poolId:    poolId ?? undefined,
        action:    data.detectedAction ?? "general",
        extracted: data.extracted ?? {},
      });
      setMode("done");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to process recording.");
      setMode("idle");
    }
  };

  const saveAsReport = async () => {
    if (!transcript || !poolId) {
      Alert.alert("Required", "Select a pool before saving.");
      return;
    }
    setSaving(true);
    try {
      await createReport.mutateAsync({
        poolId,
        companyId:   company!.id,
        servicedAt:  new Date().toISOString(),
        status:      "complete",
        techNotes:   transcript.text,
        freeChlorine:    transcript.extracted?.freeChlorine ?? null,
        ph:              transcript.extracted?.ph ?? null,
        totalAlkalinity: transcript.extracted?.alkalinity ?? null,
        isVoiceReport:   true,
      });
      Alert.alert("Saved!", "Voice report saved successfully.", [
        { text: "Done", onPress: () => { setMode("idle"); setTranscript(null); } },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setMode("idle");
    setTranscript(null);
    setDuration(0);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Voice Mode</Text>
        <Text style={styles.sub}>Dictate service notes · Auto-transcribed by Whisper</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Pool selector */}
        <Text style={styles.sectionLabel}>Pool (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !poolId && styles.chipActive]}
            onPress={() => setPoolId(null)}
          >
            <Text style={[styles.chipText, !poolId && styles.chipTextActive]}>None</Text>
          </TouchableOpacity>
          {pools.map((p: any) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, poolId === p.id && styles.chipActive]}
              onPress={() => setPoolId(p.id)}
            >
              <Text style={[styles.chipText, poolId === p.id && styles.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recording button */}
        {(mode === "idle" || mode === "recording") && (
          <View style={styles.recorderCard}>
            <TouchableOpacity
              style={[styles.micBtn, mode === "recording" && styles.micBtnActive]}
              onPress={mode === "idle" ? startRecording : stopRecording}
              disabled={false}
            >
              <Text style={styles.micEmoji}>{mode === "recording" ? "⏹" : "🎙️"}</Text>
            </TouchableOpacity>

            {mode === "recording" ? (
              <>
                <View style={styles.recordingPulse} />
                <Text style={styles.recordingTime}>{formatDuration(duration)}</Text>
                <Text style={styles.recordingHint}>Recording… tap to stop</Text>
              </>
            ) : (
              <Text style={styles.idleHint}>Tap to start recording</Text>
            )}

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>What you can dictate:</Text>
              <Text style={styles.tipItem}>• "pH was 7.6, chlorine 3.2, alkalinity 95"</Text>
              <Text style={styles.tipItem}>• "Brushed walls, vacuumed, added 2 lbs shock"</Text>
              <Text style={styles.tipItem}>• "Pump making grinding noise — needs inspection"</Text>
              <Text style={styles.tipItem}>• "Filter pressure at 22, backwashed, reset to 10"</Text>
            </View>
          </View>
        )}

        {/* Processing */}
        {mode === "processing" && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingTitle}>Transcribing with Whisper...</Text>
            <Text style={styles.processingSub}>Then extracting chemistry readings with Claude</Text>
          </View>
        )}

        {/* Result */}
        {mode === "done" && transcript && (
          <View style={styles.resultSection}>
            {/* Transcript */}
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>Transcript</Text>
              <Text style={styles.transcriptText}>{transcript.text}</Text>
            </View>

            {/* Extracted values */}
            {transcript.extracted && Object.keys(transcript.extracted).length > 0 && (
              <View style={styles.extractedCard}>
                <Text style={styles.extractedLabel}>Auto-extracted readings</Text>
                {transcript.extracted.freeChlorine != null && (
                  <Text style={styles.extractedItem}>Free Chlorine: {transcript.extracted.freeChlorine} ppm</Text>
                )}
                {transcript.extracted.ph != null && (
                  <Text style={styles.extractedItem}>pH: {transcript.extracted.ph}</Text>
                )}
                {transcript.extracted.alkalinity != null && (
                  <Text style={styles.extractedItem}>Alkalinity: {transcript.extracted.alkalinity} ppm</Text>
                )}
              </View>
            )}

            {/* Detected action */}
            {transcript.action && transcript.action !== "general" && (
              <View style={styles.actionCard}>
                <Text style={styles.actionText}>
                  {transcript.action === "chemistry"     ? "🧪 Chemistry update detected" :
                   transcript.action === "service_notes" ? "📋 Service notes detected" :
                   transcript.action === "damage"        ? "⚠️ Damage report detected" : ""}
                </Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveAsReport}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "💾  Save as Service Report"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.discardBtn} onPress={discard}>
              <Text style={styles.discardBtnText}>Discard & Record Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText:         { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 6 },
  title:            { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  sub:              { fontSize: 12, color: COLORS.textSecond, marginTop: 2 },
  content:          { padding: 16, paddingBottom: 40 },
  sectionLabel:     { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow:          { marginBottom: 20 },
  chip:             { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  chipActive:       { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:         { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive:   { color: "#fff" },
  recorderCard:     { backgroundColor: "#fff", borderRadius: RADIUS.xl, padding: 24, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  micBtn:           { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  micBtnActive:     { backgroundColor: COLORS.danger, shadowColor: COLORS.danger },
  micEmoji:         { fontSize: 40 },
  recordingPulse:   { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: COLORS.danger + "40", position: "absolute", top: 16 },
  recordingTime:    { fontSize: 32, fontWeight: "800", color: COLORS.danger, marginTop: 20 },
  recordingHint:    { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  idleHint:         { fontSize: FONTS.base, color: COLORS.textSecond, marginTop: 16 },
  tipsCard:         { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, marginTop: 20, width: "100%" },
  tipsTitle:        { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8 },
  tipItem:          { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 4, lineHeight: 18 },
  processingCard:   { backgroundColor: "#fff", borderRadius: RADIUS.xl, padding: 32, alignItems: "center", gap: 12 },
  processingTitle:  { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  processingSub:    { fontSize: FONTS.sm, color: COLORS.textSecond, textAlign: "center" },
  resultSection:    { gap: 12 },
  transcriptCard:   { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  transcriptLabel:  { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  transcriptText:   { fontSize: FONTS.base, color: COLORS.text, lineHeight: 24 },
  extractedCard:    { backgroundColor: "#d1fae5", borderRadius: RADIUS.lg, padding: 14, borderLeftWidth: 3, borderLeftColor: "#059669" },
  extractedLabel:   { fontSize: FONTS.sm, fontWeight: "700", color: "#059669", marginBottom: 8 },
  extractedItem:    { fontSize: FONTS.base, color: "#065f46", fontWeight: "600", marginBottom: 3 },
  actionCard:       { backgroundColor: "#fef3c7", borderRadius: RADIUS.md, padding: 10 },
  actionText:       { fontSize: FONTS.sm, fontWeight: "600", color: "#92400e" },
  saveBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center" },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  discardBtn:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  discardBtnText:   { color: COLORS.textSecond, fontWeight: "600", fontSize: FONTS.base },
});
