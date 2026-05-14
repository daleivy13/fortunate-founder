import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useCompliance, usePools } from "../src/hooks/useData";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

// Locked-in compliance ranges
const RANGES = [
  { param: "Free Chlorine", optimal: "3.0–5.0", acceptable: "2.0–6.0", warning: "1.0–2.0 or 6.0–8.0", out: "<1 or >8" },
  { param: "pH",            optimal: "7.4–7.6", acceptable: "7.2–7.8", warning: "6.8–7.2 or 7.8–8.2", out: "<6.8 or >8.2" },
  { param: "Alkalinity",    optimal: "80–120",  acceptable: "60–180",  warning: "40–60 or 180–220",   out: "<40 or >220" },
];

// 14-day penalty timeline
const PENALTY_DAYS = [
  { days: "Days 1–3",   label: "Notification only",                        color: "#0891b2", bg: "#cffafe" },
  { days: "Days 4–7",   label: "Tier reduced · Essential deductible 2×",  color: "#d97706", bg: "#fef3c7" },
  { days: "Days 8–10",  label: "ALL deductibles 2× · Premium warning",    color: "#ea580c", bg: "#ffedd5" },
  { days: "Days 11–13", label: "Equipment exclusions begin",               color: "#dc2626", bg: "#fee2e2" },
  { days: "Day 14",     label: "SUSPENDED — $99 reinstatement fee",        color: "#991b1b", bg: "#fecaca" },
];

const REWARDS = [
  { days: "14 days optimal",  reward: "$25 credit",                       emoji: "💰" },
  { days: "30 days optimal",  reward: "5% premium reduction",             emoji: "📉" },
  { days: "90 days optimal",  reward: "10% lifetime reduction",           emoji: "🏆" },
  { days: "365 days optimal", reward: "Pristine badge + 15% lifetime + 1 free deductible/year", emoji: "👑" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    optimal:    { bg: "#d1fae5", color: "#059669" },
    acceptable: { bg: "#cffafe", color: "#0891b2" },
    warning:    { bg: "#fef3c7", color: "#d97706" },
    out:        { bg: "#fee2e2", color: "#dc2626" },
    suspended:  { bg: "#fecaca", color: "#991b1b" },
    unknown:    { bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[status] ?? map.unknown;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function PoolComplianceCard({ pool }: { pool: any }) {
  const { data, isLoading } = useCompliance(pool.id);

  // data is the flat ComplianceStatus object from the backend
  const complianceLevel: string = !data ? "unknown" :
    (data as any).status === "suspended"       ? "suspended" :
    ((data as any).consecutiveWarningDays ?? 0) > 7 ? "out" :
    ((data as any).consecutiveWarningDays ?? 0) > 0 ? "warning" :
    ((data as any).consecutiveOptimalDays ?? 0) > 0 ? "optimal" : "acceptable";

  const penaltyDay   = (data as any)?.consecutiveWarningDays ?? 0;
  const optimalDays  = (data as any)?.consecutiveOptimalDays ?? 0;
  const lastReading  = (data as any)?.lastReading ?? null;

  return (
    <Card>
      <View style={styles.poolCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.poolCardName}>{pool.name}</Text>
          <Text style={styles.poolCardClient}>{pool.clientName}</Text>
        </View>
        {isLoading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : (
          <StatusBadge status={complianceLevel} />
        )}
      </View>

      {data && (
        <>
          {/* Streak */}
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Streak:</Text>
            <Text style={styles.streakValue}>{optimalDays} optimal days</Text>
          </View>

          {/* Active penalty */}
          {penaltyDay > 0 && (
            <View style={styles.penaltyBanner}>
              <Text style={styles.penaltyText}>
                ⚠️ Day {penaltyDay} of penalty clock — {
                  penaltyDay <= 3  ? "notification sent" :
                  penaltyDay <= 7  ? "tier reduced" :
                  penaltyDay <= 10 ? "deductibles doubled" :
                  penaltyDay <= 13 ? "exclusions active" : "SUSPENDED"
                }
              </Text>
            </View>
          )}

          {/* Last readings */}
          {lastReading && (
            <View style={styles.readingsRow}>
              <Text style={styles.readingItem}>FC: {lastReading.freeChlorine ?? "—"}</Text>
              <Text style={styles.readingItem}>pH: {lastReading.ph ?? "—"}</Text>
              <Text style={styles.readingItem}>Alk: {lastReading.alkalinity ?? "—"}</Text>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

export default function ComplianceScreen() {
  const { data: poolsData, isLoading, refetch, isRefetching } = usePools();
  const pools = poolsData?.pools ?? [];

  const [tab, setTab] = useState<"pools" | "ranges" | "rewards">("pools");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Compliance</Text>
        <Text style={styles.sub}>PoolPal Protocol · Insurance moat</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["pools", "ranges", "rewards"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "pools" ? "My Pools" : t === "ranges" ? "Ranges" : "Rewards"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {tab === "pools" && (
          <>
            {isLoading ? (
              <Text style={styles.empty}>Loading...</Text>
            ) : pools.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>No pools yet</Text>
                <Text style={styles.emptySub}>Add pools to track compliance status</Text>
              </View>
            ) : (
              pools.map((pool: any) => <PoolComplianceCard key={pool.id} pool={pool} />)
            )}

            {/* 14-day penalty timeline */}
            <Text style={styles.sectionTitle}>14-Day Penalty Timeline</Text>
            <Text style={styles.sectionSub}>Triggered by 2 consecutive bad readings</Text>
            {PENALTY_DAYS.map((p) => (
              <View key={p.days} style={[styles.penaltyRow, { backgroundColor: p.bg }]}>
                <View style={[styles.penaltyDayPill, { backgroundColor: p.color }]}>
                  <Text style={styles.penaltyDayText}>{p.days}</Text>
                </View>
                <Text style={[styles.penaltyLabel, { color: p.color }]}>{p.label}</Text>
              </View>
            ))}

            <View style={styles.exclusionCard}>
              <Text style={styles.exclusionTitle}>Equipment Exclusions (Days 11–13)</Text>
              <Text style={styles.exclusionItem}>Low pH → Heater & salt cell excluded</Text>
              <Text style={styles.exclusionItem}>High pH → Heat exchanger excluded</Text>
              <Text style={styles.exclusionItem}>Low Cl → Algae & seals excluded</Text>
              <Text style={styles.exclusionItem}>High Cl → Liner & gaskets excluded</Text>
            </View>
          </>
        )}

        {tab === "ranges" && (
          <>
            <Text style={styles.sectionTitle}>PoolPal Protocol Ranges</Text>
            {RANGES.map((r) => (
              <Card key={r.param}>
                <Text style={styles.rangeParam}>{r.param}</Text>
                <View style={styles.rangeRow}>
                  <View style={[styles.rangePill, { backgroundColor: "#d1fae5" }]}>
                    <Text style={[styles.rangePillLabel, { color: "#059669" }]}>Optimal</Text>
                    <Text style={[styles.rangePillValue, { color: "#059669" }]}>{r.optimal}</Text>
                  </View>
                  <View style={[styles.rangePill, { backgroundColor: "#cffafe" }]}>
                    <Text style={[styles.rangePillLabel, { color: "#0891b2" }]}>Accept.</Text>
                    <Text style={[styles.rangePillValue, { color: "#0891b2" }]}>{r.acceptable}</Text>
                  </View>
                  <View style={[styles.rangePill, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[styles.rangePillLabel, { color: "#d97706" }]}>Warning</Text>
                    <Text style={[styles.rangePillValue, { color: "#d97706" }]}>{r.warning}</Text>
                  </View>
                  <View style={[styles.rangePill, { backgroundColor: "#fee2e2" }]}>
                    <Text style={[styles.rangePillLabel, { color: "#dc2626" }]}>Out</Text>
                    <Text style={[styles.rangePillValue, { color: "#dc2626" }]}>{r.out}</Text>
                  </View>
                </View>
              </Card>
            ))}

            <View style={styles.graceCard}>
              <Text style={styles.graceTitle}>Grace Periods</Text>
              <Text style={styles.graceItem}>🌴 Vacation Mode — 14 days/year</Text>
              <Text style={styles.graceItem}>🤒 Sick Week — 3 forgivenesses/year</Text>
              <Text style={styles.graceItem}>🔧 Tech absence — 5 days makeup</Text>
              <Text style={styles.graceItem}>⛈️ Weather events — 7 days auto-extension</Text>
            </View>

            <View style={styles.repeatCard}>
              <Text style={styles.repeatTitle}>Repeat Offender Surcharges</Text>
              <Text style={styles.repeatItem}>2nd warning/90d → 30% surcharge 6mo + $199 reinstate</Text>
              <Text style={styles.repeatItem}>3rd warning/90d → 50% increase 12mo + Essential cap</Text>
              <Text style={styles.repeatItem}>4th warning/90d → Non-renewed, 12mo wait</Text>
            </View>
          </>
        )}

        {tab === "rewards" && (
          <>
            <Text style={styles.sectionTitle}>Maintain Optimal Chemistry · Earn Rewards</Text>
            {REWARDS.map((r) => (
              <Card key={r.days}>
                <View style={styles.rewardRow}>
                  <Text style={styles.rewardEmoji}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rewardDays}>{r.days}</Text>
                    <Text style={styles.rewardReward}>{r.reward}</Text>
                  </View>
                </View>
              </Card>
            ))}

            <View style={styles.recoveryCard}>
              <Text style={styles.recoveryTitle}>Recovery Rule</Text>
              <Text style={styles.recoveryText}>
                3 consecutive optimal readings end the penalty clock.{"\n"}
                Equipment exclusions persist 60 days after recovery.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backText:        { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 8 },
  title:           { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  sub:             { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  tabBar:          { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab:             { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: "center", backgroundColor: COLORS.borderLight },
  tabActive:       { backgroundColor: COLORS.primary },
  tabText:         { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  tabTextActive:   { color: "#fff" },
  content:         { padding: 16, paddingBottom: 40 },
  empty:           { textAlign: "center", color: COLORS.textSecond, marginTop: 32 },
  emptyState:      { alignItems: "center", paddingTop: 48 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:        { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  loading:         { fontSize: FONTS.sm, color: COLORS.textLight },
  pill:            { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:        { fontSize: 11, fontWeight: "700" },
  poolCardHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  poolCardName:    { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  poolCardClient:  { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  streakRow:       { flexDirection: "row", gap: 6, marginTop: 8 },
  streakLabel:     { fontSize: FONTS.sm, color: COLORS.textSecond },
  streakValue:     { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary },
  penaltyBanner:   { backgroundColor: "#fee2e2", borderRadius: RADIUS.sm, padding: 8, marginTop: 8 },
  penaltyText:     { fontSize: FONTS.sm, color: "#dc2626", fontWeight: "600" },
  readingsRow:     { flexDirection: "row", gap: 12, marginTop: 8 },
  readingItem:     { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  sectionTitle:    { fontSize: FONTS.base, fontWeight: "800", color: COLORS.text, marginTop: 12, marginBottom: 4 },
  sectionSub:      { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 12 },
  penaltyRow:      { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: RADIUS.md, padding: 10, marginBottom: 6 },
  penaltyDayPill:  { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4, minWidth: 80, alignItems: "center" },
  penaltyDayText:  { color: "#fff", fontSize: 11, fontWeight: "700" },
  penaltyLabel:    { flex: 1, fontSize: FONTS.sm, fontWeight: "600" },
  exclusionCard:   { backgroundColor: "#fef2f2", borderRadius: RADIUS.lg, padding: 14, marginTop: 8, borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  exclusionTitle:  { fontSize: FONTS.sm, fontWeight: "700", color: "#dc2626", marginBottom: 8 },
  exclusionItem:   { fontSize: FONTS.sm, color: "#7f1d1d", marginBottom: 3 },
  rangeParam:      { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  rangeRow:        { flexDirection: "row", gap: 6 },
  rangePill:       { flex: 1, borderRadius: RADIUS.sm, padding: 6, alignItems: "center" },
  rangePillLabel:  { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  rangePillValue:  { fontSize: 11, fontWeight: "600", marginTop: 2, textAlign: "center" },
  graceCard:       { backgroundColor: "#f0fdf4", borderRadius: RADIUS.lg, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: "#059669" },
  graceTitle:      { fontSize: FONTS.sm, fontWeight: "700", color: "#059669", marginBottom: 8 },
  graceItem:       { fontSize: FONTS.sm, color: "#14532d", marginBottom: 4 },
  repeatCard:      { backgroundColor: "#fff7ed", borderRadius: RADIUS.lg, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: "#d97706" },
  repeatTitle:     { fontSize: FONTS.sm, fontWeight: "700", color: "#d97706", marginBottom: 8 },
  repeatItem:      { fontSize: FONTS.sm, color: "#78350f", marginBottom: 4 },
  rewardRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  rewardEmoji:     { fontSize: 28 },
  rewardDays:      { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond },
  rewardReward:    { fontSize: FONTS.base, fontWeight: "800", color: COLORS.primary, marginTop: 2 },
  recoveryCard:    { backgroundColor: "#f0fdf4", borderRadius: RADIUS.lg, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: "#059669" },
  recoveryTitle:   { fontSize: FONTS.sm, fontWeight: "700", color: "#059669", marginBottom: 6 },
  recoveryText:    { fontSize: FONTS.sm, color: "#14532d", lineHeight: 20 },
});
