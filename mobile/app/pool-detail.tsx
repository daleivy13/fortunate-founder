import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePools, useReports, useEquipment } from "../src/hooks/useData";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const GRADE_DESC: Record<string, string> = {
  A: "Highly profitable · Keep this client",
  B: "Good profitability",
  C: "Average — review pricing",
  D: "Below break-even — raise rates",
  F: "Losing money — urgent action needed",
};

function gradeColor(grade: string): { dot: string; bg: string; label: string; border: string } {
  if (grade === "A" || grade === "B") return { dot: "#16a34a", bg: "#dcfce7", label: "Good",    border: "#16a34a" };
  if (grade === "C")                  return { dot: "#ca8a04", bg: "#fef9c3", label: "OK",      border: "#ca8a04" };
  return                                     { dot: "#dc2626", bg: "#fee2e2", label: "At Risk", border: "#dc2626" };
}

export default function PoolDetailScreen() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const pid = parseInt(poolId ?? "0");

  const { data: poolsData }  = usePools();
  const { data: reportsData } = useReports(pid);
  const { data: eqData }      = useEquipment(pid);

  const pool     = poolsData?.pools?.find((p: any) => p.id === pid);
  const reports  = reportsData?.reports ?? [];
  const equipment= eqData?.equipment ?? [];

  if (!pool) {
    return (
      <View style={styles.loading}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.loadingText}>Loading pool...</Text>
      </View>
    );
  }

  const lastReport  = reports[0];
  const grade       = pool.profitabilityGrade as string | undefined;
  const lastService = lastReport?.servicedAt
    ? new Date(lastReport.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{pool.name}</Text>
            <Text style={styles.client}>{pool.clientName}</Text>
          </View>
          {grade && (() => {
            const gc = gradeColor(grade);
            return (
              <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                <View style={[styles.gradeDot, { backgroundColor: gc.dot }]} />
                <Text style={[styles.gradeText, { color: gc.dot }]}>{gc.label}</Text>
              </View>
            );
          })()}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Pool info */}
        <Card>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{pool.address}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Volume</Text>
              <Text style={styles.infoValue}>{(pool.volumeGallons ?? 0).toLocaleString()} gal</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{pool.type ?? "Residential"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Service</Text>
              <Text style={styles.infoValue}>{lastService}</Text>
            </View>
          </View>
        </Card>

        {/* Profitability detail */}
        {grade && (() => {
          const gc = gradeColor(grade);
          return (
          <View style={[styles.gradeCard, { borderLeftColor: gc.dot }]}>
            <View style={styles.gradeCardHeader}>
              <View style={[styles.gradeDotLg, { backgroundColor: gc.dot }]} />
              <Text style={[styles.gradeCardTitle, { color: gc.dot }]}>
                {gc.label} — {GRADE_DESC[grade] ?? ""}
              </Text>
            </View>
            {pool.monthlyRevenue != null && (
              <Text style={styles.gradeCardStat}>Monthly revenue: ${pool.monthlyRevenue}</Text>
            )}
            {pool.estimatedCost != null && (
              <Text style={styles.gradeCardStat}>Est. cost: ${pool.estimatedCost}</Text>
            )}
            {pool.profitMargin != null && (
              <Text style={styles.gradeCardStat}>Margin: {pool.profitMargin}%</Text>
            )}
          </View>
          );
        })()}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { label: "New Report",   emoji: "📋", route: "/(tabs)/reports" },
            { label: "Chemistry",    emoji: "⚗️", route: "/chemistry"       },
            { label: "Equipment",    emoji: "🔧", route: "/equipment"       },
            { label: "Compliance",   emoji: "📊", route: "/compliance"      },
            { label: "AI Diagnose",  emoji: "🤖", route: "/diagnostic"      },
            { label: "Evidence",     emoji: "🔐", route: "/evidence"        },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => router.push(a.route as any)}
            >
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent reports */}
        <Text style={styles.sectionTitle}>Recent Reports ({reports.length})</Text>
        {reports.slice(0, 5).map((r: any) => (
          <Card key={r.id}>
            <View style={styles.reportRow}>
              <View>
                <Text style={styles.reportDate}>
                  {new Date(r.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
                {r.techNotes && (
                  <Text style={styles.reportNotes} numberOfLines={1}>{r.techNotes}</Text>
                )}
              </View>
              <View style={styles.reportRight}>
                {r.ph && <Text style={styles.reportPH}>pH {r.ph}</Text>}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: r.status === "complete" ? "#d1fae5" : "#fef3c7" },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: r.status === "complete" ? "#059669" : "#d97706" },
                  ]}>
                    {r.status}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ))}

        {/* Equipment */}
        <Text style={styles.sectionTitle}>Equipment ({equipment.length})</Text>
        {equipment.length === 0 ? (
          <TouchableOpacity
            style={styles.addEqBtn}
            onPress={() => router.push("/equipment" as any)}
          >
            <Text style={styles.addEqBtnText}>+ Register Equipment</Text>
          </TouchableOpacity>
        ) : (
          equipment.slice(0, 4).map((eq: any) => (
            <Card key={eq.id}>
              <View style={styles.eqRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eqLabel}>{eq.category?.replace(/_/g, " ")}</Text>
                  {(eq.brand || eq.model) && (
                    <Text style={styles.eqMeta}>{[eq.brand, eq.model].filter(Boolean).join(" · ")}</Text>
                  )}
                </View>
                {(eq.installed_at || eq.installedAt) && (
                  <Text style={styles.eqYear}>{new Date().getFullYear() - new Date(eq.installed_at ?? eq.installedAt).getFullYear()}y old</Text>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  loading:        { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: 56 },
  loadingText:    { textAlign: "center", color: COLORS.textSecond, marginTop: 24 },
  header:         { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText:       { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 8 },
  titleRow:       { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title:          { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  client:         { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  gradeBadge:     { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  gradeDot:       { width: 8, height: 8, borderRadius: 4 },
  gradeDotLg:     { width: 10, height: 10, borderRadius: 5 },
  gradeText:      { fontSize: 13, fontWeight: "700" },
  gradeCardHeader:{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  content:        { padding: 16, paddingBottom: 40 },
  infoGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  infoItem:       { minWidth: "45%" },
  infoLabel:      { fontSize: 11, fontWeight: "700", color: COLORS.textLight, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue:      { fontSize: FONTS.base, color: COLORS.text, fontWeight: "600", marginTop: 2 },
  gradeCard:      { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 14, marginTop: 0, marginBottom: 12, borderLeftWidth: 3 },
  gradeCardTitle: { fontSize: FONTS.base, fontWeight: "700", flex: 1 },
  gradeCardStat:  { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 2 },
  sectionTitle:   { fontSize: FONTS.base, fontWeight: "800", color: COLORS.text, marginTop: 8, marginBottom: 8 },
  actionGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  actionBtn:      { width: "30%", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  actionEmoji:    { fontSize: 22, marginBottom: 4 },
  actionLabel:    { fontSize: 11, fontWeight: "600", color: COLORS.textSecond, textAlign: "center" },
  reportRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reportDate:     { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  reportNotes:    { fontSize: 12, color: COLORS.textSecond, marginTop: 2 },
  reportRight:    { alignItems: "flex-end", gap: 4 },
  reportPH:       { fontSize: 12, color: COLORS.textSecond },
  statusBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:     { fontSize: 10, fontWeight: "700" },
  eqRow:          { flexDirection: "row", alignItems: "center" },
  eqLabel:        { fontSize: FONTS.base, fontWeight: "600", color: COLORS.text, textTransform: "capitalize" },
  eqMeta:         { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  eqYear:         { fontSize: 12, color: COLORS.textSecond },
  addEqBtn:       { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed" },
  addEqBtnText:   { color: COLORS.primary, fontWeight: "600", fontSize: FONTS.sm },
});
