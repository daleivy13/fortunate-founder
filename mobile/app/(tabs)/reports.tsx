import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, Switch, Alert, TextInput, RefreshControl,
} from "react-native";
import { useReports, useCreateReport, usePools } from "../../src/hooks/useData";
import { Card } from "../../src/components/Card";
import { PhotoDamageDetector, type PhotoResult } from "../../src/components/PhotoDamageDetector";
import { WaterBackground } from "../../src/components/WaterBackground";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";
import { useStore } from "../../src/lib/store";

const CHECKS = [
  { key: "skimmed",         label: "Skimmed" },
  { key: "brushed",         label: "Brushed walls & floor" },
  { key: "vacuumed",        label: "Vacuumed" },
  { key: "filterCleaned",   label: "Filter cleaned" },
  { key: "chemicalsAdded",  label: "Chemicals added" },
  { key: "equipmentChecked",label: "Equipment checked" },
];

export default function ReportsScreen() {
  const company = useStore((s) => s.company);
  const { data, isLoading, refetch, isRefetching } = useReports();
  const { data: poolsData } = usePools();
  const createReport = useCreateReport();

  const [showModal, setShowModal] = useState(false);
  const [poolId,    setPoolId]    = useState<number | null>(null);
  const [checks,    setChecks]    = useState<Record<string,boolean>>({
    skimmed: true, brushed: true, vacuumed: true,
    filterCleaned: false, chemicalsAdded: false, equipmentChecked: true,
  });
  const [chems, setChems] = useState({ freeChlorine: "", ph: "", totalAlkalinity: "" });
  const [notes, setNotes] = useState("");
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);

  const reports = data?.reports ?? [];
  const pools   = poolsData?.pools ?? [];

  const save = async () => {
    if (!poolId) { Alert.alert("Required", "Please select a pool."); return; }
    try {
      await createReport.mutateAsync({
        poolId:           poolId,
        companyId:        company!.id,
        servicedAt:       new Date().toISOString(),
        status:           "complete",
        ...checks,
        freeChlorine:     parseFloat(chems.freeChlorine) || null,
        ph:               parseFloat(chems.ph)           || null,
        totalAlkalinity:  parseFloat(chems.totalAlkalinity) || null,
        techNotes:        notes || null,
        damageSeverity:   photoResult?.severity ?? null,
        damageFindings:   photoResult?.findings ?? null,
        damageClaimable:  photoResult?.claimable ?? false,
      });
      setShowModal(false);
      setPoolId(null);
      setNotes("");
      setChems({ freeChlorine: "", ph: "", totalAlkalinity: "" });
      setPhotoResult(null);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save report");
    }
  };

  return (
    <View style={styles.container}>
      <WaterBackground variant="surface" style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New Report</Text>
        </TouchableOpacity>
      </WaterBackground>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptySub}>Tap "+ New Report" after servicing a pool</Text>
          </View>
        ) : (
          reports.map((r: any) => {
            const pool = pools.find((p: any) => p.id === r.poolId);
            const date = new Date(r.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <Card key={r.id}>
                <View style={styles.reportRow}>
                  <View>
                    <Text style={styles.reportPool}>{pool?.name ?? "Pool"}</Text>
                    <Text style={styles.reportClient}>{pool?.clientName}</Text>
                    <Text style={styles.reportDate}>{date}</Text>
                  </View>
                  <View style={styles.reportRight}>
                    <View style={[styles.statusBadge, r.status === "complete" ? styles.statusComplete : styles.statusPending]}>
                      <Text style={styles.statusText}>{r.status}</Text>
                    </View>
                    {r.ph && <Text style={styles.reportPH}>pH {r.ph}</Text>}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* New Report Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Service Report</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Pool selector */}
            <Text style={styles.sectionLabel}>Select Pool *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poolPicker}>
              {pools.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.poolChip, poolId === p.id && styles.poolChipActive]}
                  onPress={() => setPoolId(p.id)}
                >
                  <Text style={[styles.poolChipText, poolId === p.id && styles.poolChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Checklist */}
            <Text style={styles.sectionLabel}>Service Checklist</Text>
            {CHECKS.map(({ key, label }) => (
              <View key={key} style={styles.checkRow}>
                <Text style={styles.checkLabel}>{label}</Text>
                <Switch
                  value={checks[key]}
                  onValueChange={(v) => setChecks((c) => ({ ...c, [key]: v }))}
                  trackColor={{ true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            {/* Chemistry */}
            <Text style={styles.sectionLabel}>Water Chemistry</Text>
            {[
              { key: "freeChlorine",   label: "Free Chlorine (ppm)" },
              { key: "ph",             label: "pH" },
              { key: "totalAlkalinity",label: "Total Alkalinity (ppm)" },
            ].map(({ key, label }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(chems as any)[key]}
                  onChangeText={(v) => setChems((c) => ({ ...c, [key]: v }))}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}

            {/* Notes */}
            <Text style={styles.sectionLabel}>Tech Notes</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations, issues found..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />

            {/* Photo damage detection */}
            <PhotoDamageDetector
              poolId={poolId ?? undefined}
              onResult={(r) => setPhotoResult(r)}
            />

            <TouchableOpacity
              style={[styles.saveBtn, createReport.isPending && styles.saveBtnDisabled]}
              onPress={save}
              disabled={createReport.isPending}
            >
              <Text style={styles.saveBtnText}>
                {createReport.isPending ? "Saving..." : "Save Report & Generate PDF"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flex: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, overflow: "hidden" },
  title:          { fontSize: FONTS.xxl, fontWeight: "800", color: "#fff" },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:     { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  list:           { padding: 16 },
  empty:          { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:     { alignItems: "center", paddingTop: 48 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:     { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:       { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  reportRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reportPool:     { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  reportClient:   { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  reportDate:     { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  reportRight:    { alignItems: "flex-end", gap: 4 },
  statusBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusComplete: { backgroundColor: "#d1fae5" },
  statusPending:  { backgroundColor: "#fef3c7" },
  statusText:     { fontSize: 11, fontWeight: "700", color: COLORS.textSecond },
  reportPH:       { fontSize: 12, color: COLORS.textSecond },
  modal:          { padding: 24 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle:     { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  modalClose:     { fontSize: FONTS.base, color: COLORS.primary, fontWeight: "600" },
  sectionLabel:   { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  poolPicker:     { marginBottom: 8 },
  poolChip:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  poolChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  poolChipText:   { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  poolChipTextActive:{ color: "#fff" },
  checkRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  checkLabel:     { fontSize: FONTS.base, color: COLORS.text },
  field:          { marginBottom: 12 },
  fieldLabel:     { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  fieldInput:     { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text },
  notesInput:     { height: 100, textAlignVertical: "top" },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
});
