import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "../src/lib/api";
import { useStore } from "../src/lib/store";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const SERVICE_OPTIONS = [
  { key: "weekly_cleaning",   label: "Weekly Cleaning"   },
  { key: "chemicals",         label: "Chemical Balancing" },
  { key: "algae_treatment",   label: "Algae Treatment"   },
  { key: "equipment_repair",  label: "Equipment Repair"  },
  { key: "opening_closing",   label: "Opening / Closing" },
  { key: "filter_service",    label: "Filter Service"    },
  { key: "salt_cell",         label: "Salt Cell Service" },
  { key: "full_service",      label: "Full Service Plan" },
];

const BUDGET_OPTIONS = [
  { key: "under_100",  label: "Under $100/mo"  },
  { key: "100_200",    label: "$100–200/mo"    },
  { key: "200_plus",   label: "$200+/mo"       },
];

export default function FindAProScreen() {
  const user = useStore((s) => s.user);

  const [name,         setName]        = useState(user?.displayName ?? "");
  const [email,        setEmail]       = useState(user?.email ?? "");
  const [phone,        setPhone]       = useState("");
  const [zip,          setZip]         = useState("");
  const [city,         setCity]        = useState("");
  const [state,        setState]       = useState("");
  const [poolVolume,   setPoolVolume]  = useState("");
  const [needs,        setNeeds]       = useState<string[]>([]);
  const [budget,       setBudget]      = useState("");
  const [notes,        setNotes]       = useState("");
  const [submitted,    setSubmitted]   = useState(false);

  const submit = useMutation({
    mutationFn: (data: Record<string, any>) => api.post("/api/leads", data),
  });

  const toggleNeed = (key: string) =>
    setNeeds((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Required", "Please enter your name."); return; }
    if (!zip.trim() || zip.length < 5) { Alert.alert("Required", "Enter a valid zip code."); return; }
    if (needs.length === 0) { Alert.alert("Required", "Select at least one service need."); return; }

    try {
      await submit.mutateAsync({
        contactName:  name.trim(),
        contactEmail: email.trim() || undefined,
        contactPhone: phone.trim() || undefined,
        zipCode:      zip.trim(),
        city:         city.trim() || undefined,
        state:        state.trim() || undefined,
        serviceNeeds: needs,
        poolVolume:   poolVolume ? parseInt(poolVolume) : undefined,
        budget:       budget || undefined,
        notes:        notes.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not submit. Try again.");
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successText}>
          Pool service professionals near you will review your request and reach out.
          Most respond within 24 hours.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Find a Pool Pro</Text>
          <Text style={styles.subtitle}>
            Tell us what you need and pros in your area will contact you directly.
          </Text>
        </View>

        {/* Contact info */}
        <Text style={styles.sectionLabel}>Your Info</Text>
        <View style={styles.card}>
          {[
            { label: "Your Name *", value: name,  setter: setName,  placeholder: "Jane Smith",         keyboard: "default"    as any },
            { label: "Email",       value: email, setter: setEmail, placeholder: "jane@email.com",     keyboard: "email-address" as any },
            { label: "Phone",       value: phone, setter: setPhone, placeholder: "(555) 555-5555",     keyboard: "phone-pad"  as any },
          ].map(({ label, value, setter, placeholder, keyboard }) => (
            <View key={label} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                keyboardType={keyboard}
                autoCapitalize="none"
              />
            </View>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Zip Code *</Text>
              <TextInput
                style={styles.fieldInput}
                value={zip}
                onChangeText={setZip}
                placeholder="90210"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={[styles.field, { flex: 2, marginLeft: 8 }]}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder="Beverly Hills"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
          <View style={[styles.field, { marginTop: 0 }]}>
            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.fieldInput}
              value={state}
              onChangeText={setState}
              placeholder="CA"
              placeholderTextColor={COLORS.textLight}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Pool details */}
        <Text style={styles.sectionLabel}>Pool Details</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pool Volume (gallons)</Text>
            <TextInput
              style={styles.fieldInput}
              value={poolVolume}
              onChangeText={setPoolVolume}
              placeholder="15000"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Service needs */}
        <Text style={styles.sectionLabel}>What do you need? *</Text>
        <View style={styles.chipGrid}>
          {SERVICE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, needs.includes(opt.key) && styles.chipActive]}
              onPress={() => toggleNeed(opt.key)}
            >
              <Text style={[styles.chipText, needs.includes(opt.key) && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Budget */}
        <Text style={styles.sectionLabel}>Budget</Text>
        <View style={styles.chipGrid}>
          {BUDGET_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, budget === opt.key && styles.chipActive]}
              onPress={() => setBudget(budget === opt.key ? "" : opt.key)}
            >
              <Text style={[styles.chipText, budget === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>Additional Notes</Text>
        <View style={styles.card}>
          <TextInput
            style={[styles.fieldInput, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any specific issues, urgency, or details for the pro…"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submit.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submit.isPending}
        >
          <Text style={styles.submitBtnText}>
            {submit.isPending ? "Submitting…" : "Find Pros Near Me →"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your contact info is only shared with pros who pay to view your request.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  content:            { padding: 16, paddingBottom: 48 },
  header:             { paddingTop: 56, marginBottom: 20 },
  backBtn:            { marginBottom: 8 },
  backText:           { color: COLORS.primary, fontSize: FONTS.base, fontWeight: "600" },
  title:              { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  subtitle:           { fontSize: FONTS.sm, color: COLORS.textSecond, lineHeight: 20 },
  sectionLabel:       { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, marginTop: 20, textTransform: "uppercase", letterSpacing: 0.5 },
  card:               { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14 },
  field:              { marginBottom: 12 },
  fieldLabel:         { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  fieldInput:         { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: 12, fontSize: FONTS.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea:           { height: 80, textAlignVertical: "top" },
  row:                { flexDirection: "row" },
  chipGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:               { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive:         { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:           { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive:     { color: "#fff" },
  submitBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 24 },
  submitBtnDisabled:  { opacity: 0.6 },
  submitBtnText:      { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  disclaimer:         { textAlign: "center", fontSize: 11, color: COLORS.textLight, marginTop: 12, lineHeight: 16 },
  // Success state
  successContainer:   { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: COLORS.background },
  successEmoji:       { fontSize: 56, marginBottom: 16 },
  successTitle:       { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  successText:        { fontSize: FONTS.base, color: COLORS.textSecond, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  doneBtn:            { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText:        { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
});
