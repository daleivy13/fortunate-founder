import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { usePools, useCreatePool } from "../../src/hooks/useData";
import { useStore } from "../../src/lib/store";
import { Card } from "../../src/components/Card";
import { WaterBackground } from "../../src/components/WaterBackground";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";

function gradeColor(grade: string): { dot: string; bg: string; label: string } {
  if (grade === "A" || grade === "B") return { dot: "#16a34a", bg: "#dcfce7", label: "Good" };
  if (grade === "C")                  return { dot: "#ca8a04", bg: "#fef9c3", label: "OK" };
  return                                     { dot: "#dc2626", bg: "#fee2e2", label: "At Risk" };
}

export default function PoolsScreen() {
  const { data, isLoading, refetch, isRefetching } = usePools();
  const createPool = useCreatePool();
  const company = useStore((s) => s.company);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const isHomeowner  = company?.accountType === "homeowner";
  const allPools     = data?.pools ?? [];
  const atHomeownerCap = isHomeowner && allPools.length >= 1;

  const [form, setForm] = useState({
    name: "", address: "", clientName: "", clientEmail: "",
    clientPhone: "", volumeGallons: "15000", type: "residential",
  });

  const pools = allPools.filter((p: any) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      Alert.alert("Required", "Pool name and address are required.");
      return;
    }
    try {
      await createPool.mutateAsync({
        name:          form.name.trim(),
        address:       form.address.trim(),
        clientName:    form.clientName.trim(),
        clientEmail:   form.clientEmail.trim() || null,
        clientPhone:   form.clientPhone.trim() || null,
        volumeGallons: parseInt(form.volumeGallons) || 15000,
        type:          form.type,
      });
      setShowModal(false);
      setForm({ name: "", address: "", clientName: "", clientEmail: "", clientPhone: "", volumeGallons: "15000", type: "residential" });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create pool");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <WaterBackground variant="surface" style={styles.header}>
        <Text style={styles.title}>Pools</Text>
        {!atHomeownerCap && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Add Pool</Text>
          </TouchableOpacity>
        )}
      </WaterBackground>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search pools, clients..."
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      {/* Pool list */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : pools.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏊</Text>
            <Text style={styles.emptyTitle}>No pool yet</Text>
            <Text style={styles.emptySub}>
              {isHomeowner ? 'Tap "+ Add Pool" to register your pool' : 'Tap "+ Add Pool" to get started'}
            </Text>
          </View>
        ) : (
          pools.map((pool: any) => (
            <TouchableOpacity
              key={pool.id}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/pool-detail", params: { poolId: String(pool.id) } } as any)}
            >
              <Card>
                <View style={styles.poolRow}>
                  <View style={styles.poolAvatar}>
                    <Text style={styles.poolAvatarText}>{pool.name?.[0] ?? "P"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poolName}>{pool.name}</Text>
                    <Text style={styles.poolClient}>{pool.clientName}</Text>
                    <Text style={styles.poolAddress} numberOfLines={1}>{pool.address}</Text>
                  </View>
                  <View style={styles.poolMeta}>
                    {pool.profitabilityGrade && (() => {
                      const gc = gradeColor(pool.profitabilityGrade);
                      return (
                        <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                          <View style={[styles.gradeDot, { backgroundColor: gc.dot }]} />
                          <Text style={[styles.gradeLabel, { color: gc.dot }]}>{gc.label}</Text>
                        </View>
                      );
                    })()}
                    <Text style={styles.poolVol}>{(pool.volumeGallons ?? 0).toLocaleString()} gal</Text>
                    <View style={[styles.typeBadge, pool.type === "commercial" ? styles.commercial : styles.residential]}>
                      <Text style={styles.typeBadgeText}>{pool.type}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Pool Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pool</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: "Pool Name *", key: "name",         placeholder: "Johnson Residence" },
              { label: "Address *",   key: "address",      placeholder: "123 Main St, Scottsdale, AZ" },
              { label: "Client Name", key: "clientName",   placeholder: "Mike Johnson" },
              { label: "Client Email",key: "clientEmail",  placeholder: "mike@email.com" },
              { label: "Client Phone",key: "clientPhone",  placeholder: "(480) 555-0000" },
              { label: "Volume (gal)", key: "volumeGallons",placeholder: "15000" },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType={key === "volumeGallons" ? "numeric" : key === "clientEmail" ? "email-address" : key === "clientPhone" ? "phone-pad" : "default"}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, createPool.isPending && styles.saveBtnDisabled]}
              onPress={save}
              disabled={createPool.isPending}
            >
              <Text style={styles.saveBtnText}>
                {createPool.isPending ? "Saving..." : "Save Pool"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flex: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, overflow: "hidden" },
  title:         { fontSize: FONTS.xxl, fontWeight: "800", color: "#fff" },
  addBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  searchBox:     { paddingHorizontal: 16, marginBottom: 8 },
  searchInput:   { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, fontSize: FONTS.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  list:          { padding: 16 },
  empty:         { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:    { alignItems: "center", paddingTop: 48 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:      { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  poolRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  poolAvatar:    { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primary + "1a", alignItems: "center", justifyContent: "center" },
  poolAvatarText:{ fontSize: 18, fontWeight: "700", color: COLORS.primary },
  poolName:      { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  poolClient:    { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  poolAddress:   { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  poolMeta:      { alignItems: "flex-end", gap: 4 },
  gradeBadge:    { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  gradeDot:      { width: 7, height: 7, borderRadius: 4 },
  gradeLabel:    { fontSize: 11, fontWeight: "700" },
  poolVol:       { fontSize: 11, color: COLORS.textSecond },
  typeBadge:     { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  residential:   { backgroundColor: "#dbeafe" },
  commercial:    { backgroundColor: "#d1fae5" },
  typeBadgeText: { fontSize: 10, fontWeight: "600", color: COLORS.textSecond },
  modal:         { padding: 24 },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle:    { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  modalClose:    { fontSize: FONTS.base, color: COLORS.primary, fontWeight: "600" },
  field:         { marginBottom: 16 },
  fieldLabel:    { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  fieldInput:    { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text },
  saveBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:   { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
});
