import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useStore, type UserRole } from "../src/lib/store";
import { api } from "../src/lib/api";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";
import { WaterBackground } from "../src/components/WaterBackground";

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES: { id: UserRole; emoji: string; label: string; sub: string; color: string }[] = [
  {
    id:    "homeowner",
    emoji: "🏠",
    label: "Homeowner",
    sub:   "I own a pool and want to manage it myself — track chemistry, equipment, and service history.",
    color: "#0891b2",
  },
  {
    id:    "employee",
    emoji: "🔧",
    label: "Employee / Technician",
    sub:   "I work for a pool service company — I'll join my employer's team with their Company ID.",
    color: COLORS.primary,
  },
  {
    id:    "employer",
    emoji: "🏢",
    label: "Admin / Business Owner",
    sub:   "I run a pool service business — I'll set up my company, manage crews, and track all pools.",
    color: "#7c3aed",
  },
];

// ── Plan options (employer only) ───────────────────────────────────────────────
const PLANS = [
  { id: "starter",    label: "Starter",    sub: "Up to 10 pools · Free",   color: "#6b7280" },
  { id: "solo",       label: "Solo",       sub: "Up to 50 pools · $29/mo", color: COLORS.primary },
  { id: "growth",     label: "Growth",     sub: "Up to 200 pools · $79/mo",color: "#7c3aed" },
  { id: "enterprise", label: "Enterprise", sub: "Unlimited · $149/mo",     color: "#b45309" },
];

export default function OnboardingScreen() {
  const { user, setCompany, setRole } = useStore();

  // step 0 = role picker
  // step 1 = role-specific form
  // step 2 = plan picker (employer only)
  const [step,      setStep]      = useState(0);
  const [role,      setLocalRole] = useState<UserRole | null>(null);

  // Homeowner fields
  const [ownerName, setOwnerName] = useState("");

  // Employee fields
  const [companyId, setCompanyId] = useState("");
  const [joining,   setJoining]   = useState(false);
  const [foundCo,   setFoundCo]   = useState<{ id: number; name: string } | null>(null);

  // Employer fields
  const [bizName,   setBizName]   = useState("");
  const [plan,      setPlan]      = useState("starter");
  const [saving,    setSaving]    = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const pickRole = (r: UserRole) => {
    setLocalRole(r);
    setStep(1);
  };

  // Homeowner: create a personal account
  const createHomeowner = async () => {
    const displayName = ownerName.trim() || user?.displayName || "My";
    setSaving(true);
    try {
      const res = await api.post("/api/companies", {
        companyName: `${displayName}'s Pool`,
        plan:        "starter",
        ownerId:     user?.uid,
        email:       user?.email,
        accountType: "homeowner",
      }) as any;
      setRole("homeowner");
      setCompany(res.company ?? res);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create account.");
    } finally {
      setSaving(false);
    }
  };

  // Employee: look up the company by ID
  const lookupCompany = async () => {
    const id = companyId.trim();
    if (!id) { Alert.alert("Required", "Enter your employer's Company ID."); return; }
    setJoining(true);
    setFoundCo(null);
    try {
      const res = await api.get<{ company: { id: number; name: string } }>(
        `/api/companies/${id}`
      ) as any;
      const co = res.company ?? res;
      if (!co?.id) throw new Error("Company not found");
      setFoundCo(co);
    } catch {
      Alert.alert("Not found", "No company found with that ID. Ask your employer for their Company ID from Settings → Profile.");
    } finally {
      setJoining(false);
    }
  };

  // Employee: join the found company
  const joinCompany = () => {
    if (!foundCo) return;
    setRole("employee");
    setCompany({ id: foundCo.id, name: foundCo.name, plan: "", ownerId: "" });
    router.replace("/(tabs)/dashboard");
  };

  // Employer: create company
  const createEmployer = async () => {
    if (!bizName.trim()) { Alert.alert("Required", "Enter your business name."); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/companies", {
        companyName: bizName.trim(),
        plan,
        ownerId:     user?.uid,
        email:       user?.email,
      }) as any;
      setRole("employer");
      setCompany(res.company ?? res);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create company.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <WaterBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🏊 PoolPal AI</Text>

        {/* ── Step 0: Role selection ── */}
        {step === 0 && (
          <>
            <Text style={styles.heading}>How will you use PoolPal?</Text>
            <Text style={styles.sub}>Choose the option that best describes you so we can set things up right.</Text>

            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleCard, { borderColor: r.color }]}
                onPress={() => pickRole(r.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: r.color }]}>{r.label}</Text>
                  <Text style={styles.roleSub}>{r.sub}</Text>
                </View>
                <Text style={[styles.roleArrow, { color: r.color }]}>→</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Step 1a: Homeowner ── */}
        {step === 1 && role === "homeowner" && (
          <>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>🏠 Homeowner</Text>
            </View>
            <Text style={styles.heading}>Let's set up your pool account</Text>
            <Text style={styles.sub}>We'll create a personal account where you can track chemistry, equipment, and service history for your pool.</Text>

            <Text style={styles.label}>Your First Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder={user?.displayName?.split(" ")[0] ?? "Alex"}
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What you get</Text>
              {["Track water chemistry & get AI recommendations", "Manage pool equipment with age tracking", "Store service history & photos"].map((t) => (
                <Text key={t} style={styles.infoItem}>✓  {t}</Text>
              ))}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, styles.btnFlex, saving && styles.btnDisabled]}
                onPress={createHomeowner}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.nextBtnText}>Create My Account →</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 1b: Employee ── */}
        {step === 1 && role === "employee" && (
          <>
            <View style={[styles.stepBadge, { backgroundColor: COLORS.primary + "15" }]}>
              <Text style={[styles.stepBadgeText, { color: COLORS.primary }]}>🔧 Employee / Technician</Text>
            </View>
            <Text style={styles.heading}>Join your employer's team</Text>
            <Text style={styles.sub}>Ask your employer or admin for the Company ID — they can find it in Settings → Profile.</Text>

            <Text style={styles.label}>Employer's Company ID</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                value={companyId}
                onChangeText={(t) => { setCompanyId(t); setFoundCo(null); }}
                placeholder="e.g. 42"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.lookupBtn, joining && styles.btnDisabled]}
                onPress={lookupCompany}
                disabled={joining}
              >
                {joining
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.lookupBtnText}>Find</Text>}
              </TouchableOpacity>
            </View>

            {foundCo && (
              <View style={styles.foundCard}>
                <Text style={styles.foundLabel}>Found:</Text>
                <Text style={styles.foundName}>{foundCo.name}</Text>
                <Text style={styles.foundSub}>Company ID: {foundCo.id}</Text>
                <TouchableOpacity style={styles.joinBtn} onPress={joinCompany}>
                  <Text style={styles.joinBtnText}>Join {foundCo.name} →</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>As a technician you can</Text>
              {["Submit service reports from the field", "Log water chemistry readings", "Use AI diagnostics for pool issues", "Record voice notes hands-free"].map((t) => (
                <Text key={t} style={styles.infoItem}>✓  {t}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 1c: Employer — business name ── */}
        {step === 1 && role === "employer" && (
          <>
            <View style={[styles.stepBadge, { backgroundColor: "#7c3aed15" }]}>
              <Text style={[styles.stepBadgeText, { color: "#7c3aed" }]}>🏢 Business Owner</Text>
            </View>
            <Text style={styles.heading}>Set up your business</Text>
            <Text style={styles.sub}>We'll create your company account. Your techs can join using your Company ID from Settings.</Text>

            <Text style={styles.label}>Company / Business Name</Text>
            <TextInput
              style={styles.input}
              value={bizName}
              onChangeText={setBizName}
              placeholder="Sunshine Pool Service"
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, styles.btnFlex, !bizName.trim() && styles.btnDisabled]}
                onPress={() => bizName.trim() && setStep(2)}
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 2: Employer — plan selection ── */}
        {step === 2 && role === "employer" && (
          <>
            <View style={[styles.stepBadge, { backgroundColor: "#7c3aed15" }]}>
              <Text style={[styles.stepBadgeText, { color: "#7c3aed" }]}>🏢 {bizName}</Text>
            </View>
            <Text style={styles.heading}>Choose your plan</Text>
            <Text style={styles.sub}>You can upgrade or downgrade at any time from Settings.</Text>

            {PLANS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.planCard, plan === p.id && { borderColor: p.color, borderWidth: 2 }]}
                onPress={() => setPlan(p.id)}
              >
                <View style={[styles.planDot, { backgroundColor: plan === p.id ? p.color : COLORS.borderLight }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, plan === p.id && { color: p.color }]}>{p.label}</Text>
                  <Text style={styles.planSub}>{p.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, styles.btnFlex, saving && styles.btnDisabled]}
                onPress={createEmployer}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.nextBtnText}>Get Started →</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </WaterBackground>
  );
}

const styles = StyleSheet.create({
  container:      { padding: 24, paddingTop: 72, paddingBottom: 40 },
  logo:           { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 32, color: "#fff" },
  heading:        { fontSize: FONTS.xxl, fontWeight: "800", color: "#fff", marginBottom: 6 },
  sub:            { fontSize: FONTS.base, color: "rgba(255,255,255,0.8)", marginBottom: 24, lineHeight: 22 },

  // Role cards
  roleCard:       { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.92)",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  roleEmoji:      { fontSize: 28 },
  roleLabel:      { fontSize: FONTS.base, fontWeight: "800", marginBottom: 3 },
  roleSub:        { fontSize: 12, color: COLORS.textSecond, lineHeight: 17 },
  roleArrow:      { fontSize: 20, fontWeight: "700" },

  // Step badge
  stepBadge:      { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 16 },
  stepBadgeText:  { fontSize: FONTS.sm, fontWeight: "700", color: "#fff" },

  // Form
  label:          { fontSize: FONTS.sm, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 8 },
  input:          { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: RADIUS.md, padding: 16, fontSize: FONTS.base, color: COLORS.text, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },

  // Employee search row
  searchRow:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  searchInput:    { flex: 1, marginBottom: 0 },
  lookupBtn:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 18, justifyContent: "center" },
  lookupBtnText:  { color: "#fff", fontWeight: "700", fontSize: FONTS.base },

  // Found company card
  foundCard:      { backgroundColor: "#d1fae5", borderRadius: RADIUS.lg, padding: 16, marginBottom: 20 },
  foundLabel:     { fontSize: FONTS.sm, fontWeight: "600", color: "#065f46", marginBottom: 2 },
  foundName:      { fontSize: FONTS.xl, fontWeight: "800", color: "#065f46" },
  foundSub:       { fontSize: FONTS.sm, color: "#047857", marginBottom: 14, marginTop: 2 },
  joinBtn:        { backgroundColor: "#059669", borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  joinBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },

  // Info card
  infoCard:       { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: 16, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  infoTitle:      { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  infoItem:       { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 6, lineHeight: 19 },

  // Plan cards
  planCard:       { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  planDot:        { width: 18, height: 18, borderRadius: 9 },
  planName:       { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  planSub:        { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },

  // Buttons
  btnRow:         { flexDirection: "row", gap: 12, marginTop: 8 },
  nextBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center" },
  btnDisabled:    { opacity: 0.5 },
  btnFlex:        { flex: 1 },
  nextBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  backBtn:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, paddingHorizontal: 20, alignItems: "center" },
  backBtnText:    { color: COLORS.textSecond, fontWeight: "600", fontSize: FONTS.base },
});
