import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, TextInput, Alert, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useEquipment, useCreateEquipment, usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

// All 16 equipment categories
const CATEGORIES = [
  { id: "pump",         label: "Pump",                emoji: "⚙️"  },
  { id: "filter",       label: "Filter",              emoji: "🔘"  },
  { id: "heater",       label: "Heater",              emoji: "🔥"  },
  { id: "salt_cell",    label: "Salt Cell / SWG",     emoji: "🧂"  },
  { id: "automation",   label: "Automation System",   emoji: "🤖"  },
  { id: "lights",       label: "Pool Lights",         emoji: "💡"  },
  { id: "cleaner",      label: "Automatic Cleaner",   emoji: "🤿"  },
  { id: "cover",        label: "Pool Cover",          emoji: "📦"  },
  { id: "diving_board", label: "Diving Board",        emoji: "🏊"  },
  { id: "slide",        label: "Slide",               emoji: "🛝"  },
  { id: "spa",          label: "Spa / Hot Tub",       emoji: "♨️"  },
  { id: "pop_up",       label: "Pop-Up Cleaners",     emoji: "⬆️"  },
  { id: "water_feature",label: "Water Feature",       emoji: "⛲"  },
  { id: "controller",   label: "Pool Controller",     emoji: "📱"  },
  { id: "chemical_feed",label: "Chemical Feeder",     emoji: "🧪"  },
  { id: "other",        label: "Other",               emoji: "🔧"  },
];

const AGE_COLORS: Record<string, string> = {
  good:    "#059669",
  ok:      "#0891b2",
  aging:   "#d97706",
  old:     "#dc2626",
};

function getAgeStatus(installYear?: number): { label: string; color: string } {
  if (!installYear) return { label: "Unknown age", color: COLORS.textLight };
  const age = new Date().getFullYear() - installYear;
  if (age < 5)  return { label: `${age}y old · Good`,   color: AGE_COLORS.good   };
  if (age < 8)  return { label: `${age}y old · OK`,     color: AGE_COLORS.ok     };
  if (age < 12) return { label: `${age}y old · Aging`,  color: AGE_COLORS.aging  };
  return          { label: `${age}y old · Replace`,     color: AGE_COLORS.old    };
}

export default function EquipmentScreen() {
  const company = useStore((s) => s.company);
  const { data, isLoading, refetch, isRefetching } = useEquipment();
  const { data: poolsData } = usePools();
  const addEquipment = useCreateEquipment();

  const [showModal,  setShowModal]  = useState(false);
  const [poolId,     setPoolId]     = useState<number | null>(null);
  const [category,   setCategory]   = useState("pump");
  const [brand,      setBrand]      = useState("");
  const [model,      setModel]      = useState("");
  const [serial,     setSerial]     = useState("");
  const [installYr,  setInstallYr]  = useState("");
  const [notes,      setNotes]      = useState("");

  const equipment = data?.equipment ?? [];
  const pools     = poolsData?.pools ?? [];

  // Group equipment by pool
  const grouped = pools.reduce<Record<number, any[]>>((acc, pool: any) => {
    acc[pool.id] = equipment.filter((e: any) => e.poolId === pool.id);
    return acc;
  }, {});

  const save = async () => {
    if (!poolId) { Alert.alert("Required", "Select a pool."); return; }
    try {
      await addEquipment.mutateAsync({
        poolId,
        category,
        brand:       brand.trim() || null,
        model:       model.trim() || null,
        serialNumber:serial.trim() || null,
        installedAt: installYr ? `${installYr}-01-01` : null,
        notes:       notes.trim() || null,
      });
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to add equipment");
    }
  };

  const resetForm = () => {
    setPoolId(null); setCategory("pump"); setBrand(""); setModel("");
    setSerial(""); setInstallYr(""); setNotes("");
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Equipment Register</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>{equipment.length} items · {pools.length} pools</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : equipment.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔧</Text>
            <Text style={styles.emptyTitle}>No equipment yet</Text>
            <Text style={styles.emptySub}>Register all pool equipment to keep track of age and service history</Text>
          </View>
        ) : (
          pools.map((pool: any) => {
            const items = grouped[pool.id] ?? [];
            if (!items.length) return null;
            return (
              <View key={pool.id} style={styles.poolGroup}>
                <Text style={styles.poolGroupTitle}>
                  🏊 {pool.name} · {items.length} items
                </Text>
                {items.map((eq: any) => {
                  const cat  = CATEGORIES.find((c) => c.id === eq.category);
                  const installedAtRaw = eq.installed_at ?? eq.installedAt;
                  const installYear = installedAtRaw ? new Date(installedAtRaw).getFullYear() : undefined;
                  const age  = getAgeStatus(installYear);
                  return (
                    <Card key={eq.id}>
                      <View style={styles.eqRow}>
                        <Text style={styles.eqEmoji}>{cat?.emoji ?? "🔧"}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.eqLabel}>{cat?.label ?? eq.category}</Text>
                          {(eq.brand || eq.model) && (
                            <Text style={styles.eqMeta}>{[eq.brand, eq.model].filter(Boolean).join(" · ")}</Text>
                          )}
                          {eq.serialNumber && (
                            <Text style={styles.eqSerial}>S/N: {eq.serialNumber}</Text>
                          )}
                        </View>
                        <View style={styles.eqRight}>
                          <Text style={[styles.eqAge, { color: age.color }]}>{age.label}</Text>
                          <View style={[styles.statusDot, { backgroundColor: age.color }]} />
                        </View>
                      </View>
                      {eq.notes ? (
                        <Text style={styles.eqNotes}>{eq.notes}</Text>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            );
          })
        )}

      </ScrollView>

      {/* Add Equipment Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Equipment</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Pool selector */}
            <Text style={styles.sectionLabel}>Pool *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
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

            {/* Category */}
            <Text style={styles.sectionLabel}>Category *</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catBtn, category === c.id && styles.catBtnActive]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catLabel, category === c.id && styles.catLabelActive]} numberOfLines={1}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Details */}
            {[
              { label: "Brand",        value: brand,     setter: setBrand,     placeholder: "Pentair, Hayward, Jandy..." },
              { label: "Model",        value: model,     setter: setModel,     placeholder: "SuperFlo VS, TriStar..." },
              { label: "Serial #",     value: serial,    setter: setSerial,    placeholder: "Optional" },
              { label: "Install Year", value: installYr, setter: setInstallYr, placeholder: "2018", numeric: true },
            ].map(({ label, value, setter, placeholder, numeric }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType={numeric ? "number-pad" : "default"}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, { height: 70, textAlignVertical: "top" }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Condition, last service, issues..."
                placeholderTextColor={COLORS.textLight}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, addEquipment.isPending && styles.saveBtnDisabled]}
              onPress={save}
              disabled={addEquipment.isPending}
            >
              <Text style={styles.saveBtnText}>
                {addEquipment.isPending ? "Saving..." : `Save ${selectedCat?.label ?? "Equipment"}`}
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
  header:         { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backText:       { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 8 },
  headerRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title:          { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  addBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:     { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  sub:            { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  list:           { padding: 16, paddingBottom: 40 },
  empty:          { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:     { alignItems: "center", paddingTop: 48 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:     { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:       { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4, textAlign: "center" },
  poolGroup:      { marginBottom: 16 },
  poolGroupTitle: { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  eqRow:          { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eqEmoji:        { fontSize: 24, marginTop: 2 },
  eqLabel:        { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  eqMeta:         { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  eqSerial:       { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  eqRight:        { alignItems: "flex-end", gap: 4 },
  eqAge:          { fontSize: 12, fontWeight: "600" },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  eqNotes:        { fontSize: 12, color: COLORS.textSecond, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  tipCard:        { backgroundColor: "#eff6ff", borderRadius: RADIUS.lg, padding: 14, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  tipTitle:       { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary, marginBottom: 6 },
  tipText:        { fontSize: 12, color: COLORS.textSecond, lineHeight: 18 },
  modal:          { padding: 24 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle:     { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  modalClose:     { fontSize: FONTS.base, color: COLORS.primary, fontWeight: "600" },
  sectionLabel:   { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow:        { marginBottom: 16 },
  chip:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  catGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catBtn:         { width: "30%", alignItems: "center", backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: COLORS.border },
  catBtnActive:   { backgroundColor: COLORS.primary + "15", borderColor: COLORS.primary },
  catEmoji:       { fontSize: 20, marginBottom: 2 },
  catLabel:       { fontSize: 10, fontWeight: "600", color: COLORS.textSecond, textAlign: "center" },
  catLabelActive: { color: COLORS.primary },
  field:          { marginBottom: 14 },
  fieldLabel:     { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  fieldInput:     { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
});
