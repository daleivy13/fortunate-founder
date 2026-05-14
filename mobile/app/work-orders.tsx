import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, TextInput, Alert, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useWorkOrders, useCreateWorkOrder, usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#dc2626",
  urgent: "#dc2626",
  medium: "#d97706",
  normal: "#d97706",
  low:    "#059669",
};
const PRIORITY_BG: Record<string, string> = {
  high:   "#fee2e2",
  urgent: "#fee2e2",
  medium: "#fef3c7",
  normal: "#fef3c7",
  low:    "#d1fae5",
};
const STATUS_COLORS: Record<string, string> = {
  open:        "#0891b2",
  pending:     "#0891b2",
  in_progress: "#d97706",
  completed:   "#059669",
  complete:    "#059669",
  cancelled:   "#6b7280",
};
const STATUS_BG: Record<string, string> = {
  open:        "#cffafe",
  pending:     "#cffafe",
  in_progress: "#fef3c7",
  completed:   "#d1fae5",
  complete:    "#d1fae5",
  cancelled:   "#f3f4f6",
};

const WORK_TYPES = [
  "Repair",
  "Maintenance",
  "Chemical Treatment",
  "Equipment Replacement",
  "Inspection",
  "Cleaning",
  "Installation",
  "Other",
];

export default function WorkOrdersScreen() {
  const company = useStore((s) => s.company);
  const { data, isLoading, refetch, isRefetching } = useWorkOrders();
  const { data: poolsData } = usePools();
  const createWO = useCreateWorkOrder();

  const [showModal, setShowModal]   = useState(false);
  const [filter,    setFilter]      = useState<"all" | "open" | "completed">("all");

  // Form
  const [poolId,    setPoolId]    = useState<number | null>(null);
  const [title,     setTitle]     = useState("");
  const [desc,      setDesc]      = useState("");
  const [priority,  setPriority]  = useState<"high" | "medium" | "low">("medium");
  const [workType,  setWorkType]  = useState("Maintenance");
  const [dueDate,   setDueDate]   = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const workOrders = data?.workOrders ?? [];
  const pools      = poolsData?.pools ?? [];

  const filtered = workOrders.filter((wo: any) => {
    if (filter === "open")      return ["open", "pending", "in_progress"].includes(wo.status);
    if (filter === "completed") return wo.status === "completed" || wo.status === "complete";
    return true;
  });

  const openCount = workOrders.filter((wo: any) =>
    ["open", "pending", "in_progress"].includes(wo.status)
  ).length;

  // Map mobile work type labels to backend category enum values
  const WORK_TYPE_TO_CATEGORY: Record<string, string> = {
    "Repair":               "repair",
    "Maintenance":          "recurring_maintenance",
    "Chemical Treatment":   "chemical_treatment",
    "Equipment Replacement":"replacement",
    "Inspection":           "inspection",
    "Cleaning":             "other",
    "Installation":         "equipment_install",
    "Other":                "other",
  };

  const save = async () => {
    if (!poolId)       { Alert.alert("Required", "Select a pool."); return; }
    if (!title.trim()) { Alert.alert("Required", "Enter a title."); return; }
    try {
      await createWO.mutateAsync({
        poolId,
        companyId:   company!.id,
        title:       title.trim(),
        description: desc.trim() || null,
        // backend accepts "low"|"normal"|"high"|"urgent" — map "medium" → "normal"
        priority:    priority === "medium" ? "normal" : priority,
        category:    WORK_TYPE_TO_CATEGORY[workType] ?? "other",
        scheduledAt: dueDate,
      });
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create work order");
    }
  };

  const resetForm = () => {
    setPoolId(null); setTitle(""); setDesc(""); setPriority("medium");
    setWorkType("Maintenance");
    const d = new Date(); d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split("T")[0]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Work Orders</Text>
            {openCount > 0 && (
              <Text style={styles.openBadge}>{openCount} open</Text>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "open", "completed"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔧</Text>
            <Text style={styles.emptyTitle}>
              {filter === "all" ? "No work orders" : `No ${filter} work orders`}
            </Text>
            <Text style={styles.emptySub}>Tap "+ New" to create a work order</Text>
          </View>
        ) : (
          filtered.map((wo: any) => {
            // Backend returns snake_case from raw SQL
            const woPoolId = wo.pool_id ?? wo.poolId;
            const pool     = pools.find((p: any) => p.id === woPoolId);
            const dueRaw   = wo.next_due_date ?? wo.scheduled_at ?? wo.dueDate;
            const due      = dueRaw ? new Date(dueRaw).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
            const isOverdue = dueRaw && new Date(dueRaw) < new Date() && wo.status !== "complete" && wo.status !== "completed";

            return (
              <Card key={wo.id}>
                <View style={styles.woHeader}>
                  <View style={styles.woTitleRow}>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[wo.priority ?? "medium"] }]} />
                    <Text style={styles.woTitle} numberOfLines={1}>{wo.title}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: STATUS_BG[wo.status] ?? STATUS_BG.open }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLORS[wo.status] ?? STATUS_COLORS.open }]}>
                      {(wo.status ?? "open").replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.woPool}>{pool?.name ?? "Pool"} · {wo.category?.replace(/_/g, " ") ?? wo.workType ?? ""}</Text>
                {wo.description ? (
                  <Text style={styles.woDesc} numberOfLines={2}>{wo.description}</Text>
                ) : null}

                <View style={styles.woFooter}>
                  <Text style={[styles.woDue, isOverdue ? styles.woDueOverdue : {}]}>
                    {isOverdue ? "⚠️ " : ""}Due: {due}
                  </Text>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_BG[wo.priority ?? "medium"] }]}>
                    <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[wo.priority ?? "medium"] }]}>
                      {(wo.priority ?? "medium").toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* New Work Order Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Work Order</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Pool */}
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

            {/* Title */}
            <Text style={styles.sectionLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Replace pump motor, fix leak..."
              placeholderTextColor={COLORS.textLight}
            />

            {/* Work type */}
            <Text style={styles.sectionLabel}>Work Type</Text>
            <View style={styles.typeGrid}>
              {WORK_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, workType === t && styles.typeBtnActive]}
                  onPress={() => setWorkType(t)}
                >
                  <Text style={[styles.typeBtnText, workType === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority */}
            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(["high", "medium", "low"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityBtn,
                    priority === p && { backgroundColor: PRIORITY_BG[p], borderColor: PRIORITY_COLORS[p] },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, priority === p && { color: PRIORITY_COLORS[p] }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due date */}
            <Text style={styles.sectionLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Details, parts needed, instructions..."
              placeholderTextColor={COLORS.textLight}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, createWO.isPending && styles.saveBtnDisabled]}
              onPress={save}
              disabled={createWO.isPending}
            >
              <Text style={styles.saveBtnText}>{createWO.isPending ? "Creating..." : "Create Work Order"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backText:           { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 8 },
  headerRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:              { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  openBadge:          { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: "600", marginTop: 2 },
  addBtn:             { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:         { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  filterRow:          { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginTop: 8, marginBottom: 4 },
  filterTab:          { flex: 1, paddingVertical: 7, borderRadius: RADIUS.full, alignItems: "center", backgroundColor: COLORS.borderLight },
  filterTabActive:    { backgroundColor: COLORS.primary },
  filterTabText:      { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  filterTabTextActive:{ color: "#fff" },
  list:               { padding: 16, paddingBottom: 40 },
  empty:              { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:         { alignItems: "center", paddingTop: 48 },
  emptyEmoji:         { fontSize: 48, marginBottom: 12 },
  emptyTitle:         { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:           { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  woHeader:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  woTitleRow:         { flexDirection: "row", alignItems: "center", flex: 1, gap: 8, marginRight: 8 },
  priorityDot:        { width: 8, height: 8, borderRadius: 4 },
  woTitle:            { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text, flex: 1 },
  badge:              { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:          { fontSize: 10, fontWeight: "700" },
  woPool:             { fontSize: FONTS.sm, color: COLORS.textSecond },
  woDesc:             { fontSize: FONTS.sm, color: COLORS.textLight, marginTop: 4 },
  woFooter:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  woDue:              { fontSize: 12, color: COLORS.textSecond },
  woDueOverdue:       { color: "#dc2626", fontWeight: "600" },
  priorityBadge:      { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  priorityBadgeText:  { fontSize: 10, fontWeight: "700" },
  modal:              { padding: 24 },
  modalHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle:         { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  modalClose:         { fontSize: FONTS.base, color: COLORS.primary, fontWeight: "600" },
  sectionLabel:       { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow:            { marginBottom: 16 },
  chip:               { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  chipActive:         { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:           { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive:     { color: "#fff" },
  input:              { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text, marginBottom: 16 },
  typeGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn:            { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fff" },
  typeBtnActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText:        { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  typeBtnTextActive:  { color: "#fff" },
  priorityRow:        { flexDirection: "row", gap: 8, marginBottom: 16 },
  priorityBtn:        { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, alignItems: "center", backgroundColor: "#fff" },
  priorityBtnText:    { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  saveBtn:            { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled:    { opacity: 0.6 },
  saveBtnText:        { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
});
