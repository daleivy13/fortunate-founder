import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, TextInput, Alert, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useInvoices, useCreateInvoice, usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const STATUS_COLORS: Record<string, string> = {
  paid:    "#059669",
  unpaid:  "#d97706",
  overdue: "#dc2626",
  draft:   "#6b7280",
};
const STATUS_BG: Record<string, string> = {
  paid:    "#d1fae5",
  unpaid:  "#fef3c7",
  overdue: "#fee2e2",
  draft:   "#f3f4f6",
};

export default function InvoicesScreen() {
  const company   = useStore((s) => s.company);
  const { data, isLoading, refetch, isRefetching } = useInvoices();
  const { data: poolsData } = usePools();
  const createInvoice = useCreateInvoice();

  const [showModal, setShowModal] = useState(false);
  const [poolId,    setPoolId]    = useState<number | null>(null);
  const [amount,    setAmount]    = useState("");
  const [desc,      setDesc]      = useState("");
  const [dueDate,   setDueDate]   = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const invoices = data?.invoices ?? [];
  const pools    = poolsData?.pools ?? [];

  const totalOutstanding = invoices
    .filter((i: any) => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);

  const submitInvoice = async () => {
    if (!poolId)       { Alert.alert("Required", "Select a pool."); return; }
    if (!amount.trim()){ Alert.alert("Required", "Enter an amount."); return; }
    if (!desc.trim())  { Alert.alert("Required", "Enter a description."); return; }
    const selectedPool = pools.find((p: any) => p.id === poolId);
    try {
      await createInvoice.mutateAsync({
        poolId,
        companyId:   company!.id,
        clientName:  selectedPool?.clientName || selectedPool?.name || "Client",
        lineItems:   JSON.stringify([{ desc: desc.trim(), qty: 1, rate: parseFloat(amount) || 0 }]),
        dueDate,
      });
      setShowModal(false);
      setPoolId(null);
      setAmount("");
      setDesc("");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create invoice");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Invoices</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Outstanding total */}
      {totalOutstanding > 0 && (
        <View style={styles.outstandingBar}>
          <Text style={styles.outstandingText}>
            Outstanding: <Text style={styles.outstandingAmt}>${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySub}>Tap "+ New" to create your first invoice</Text>
          </View>
        ) : (
          invoices.map((inv: any) => {
            const pool   = pools.find((p: any) => p.id === inv.poolId);
            const status = inv.status ?? "unpaid";
            const issued = (inv.createdAt ?? inv.issuedAt)
              ? new Date(inv.createdAt ?? inv.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            const due = inv.dueDate
              ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            let desc = inv.description ?? "";
            if (!desc && inv.lineItems) {
              try {
                const items = JSON.parse(inv.lineItems);
                desc = items[0]?.desc ?? items[0]?.description ?? "";
              } catch {}
            }

            return (
              <Card key={inv.id}>
                <View style={styles.invRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invPool}>{pool?.name ?? inv.clientName ?? "Client"}</Text>
                    <Text style={styles.invDesc} numberOfLines={1}>{desc}</Text>
                    <Text style={styles.invDate}>Issued {issued} · Due {due}</Text>
                  </View>
                  <View style={styles.invRight}>
                    <Text style={styles.invAmount}>${parseFloat(inv.amount ?? 0).toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[status] ?? STATUS_BG.draft }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[status] ?? STATUS_COLORS.draft }]}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* New Invoice Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Invoice</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Pool selector */}
            <Text style={styles.sectionLabel}>Pool *</Text>
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

            {/* Amount */}
            <Text style={styles.sectionLabel}>Amount (USD) *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="150.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Monthly pool service — May 2026"
              placeholderTextColor={COLORS.textLight}
              multiline
            />

            {/* Due Date */}
            <Text style={styles.sectionLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
            />

            <TouchableOpacity
              style={[styles.saveBtn, createInvoice.isPending && styles.saveBtnDisabled]}
              onPress={submitInvoice}
              disabled={createInvoice.isPending}
            >
              <Text style={styles.saveBtnText}>{createInvoice.isPending ? "Creating..." : "Create Invoice"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backText:        { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 4 },
  title:           { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  addBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:      { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  outstandingBar:  { backgroundColor: "#fef3c7", paddingHorizontal: 16, paddingVertical: 10 },
  outstandingText: { fontSize: FONTS.sm, color: "#92400e" },
  outstandingAmt:  { fontWeight: "700" },
  list:            { padding: 16 },
  empty:           { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:      { alignItems: "center", paddingTop: 48 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:        { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  invRow:          { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  invPool:         { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  invDesc:         { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  invDate:         { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  invRight:        { alignItems: "flex-end", gap: 4 },
  invAmount:       { fontSize: FONTS.lg, fontWeight: "800", color: COLORS.text },
  statusBadge:     { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:      { fontSize: 10, fontWeight: "700" },
  modal:           { padding: 24 },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle:      { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  modalClose:      { fontSize: FONTS.base, color: COLORS.primary, fontWeight: "600" },
  sectionLabel:    { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  poolPicker:      { marginBottom: 16 },
  poolChip:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  poolChipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  poolChipText:    { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  poolChipTextActive: { color: "#fff" },
  input:           { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text, marginBottom: 16 },
  saveBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
});
