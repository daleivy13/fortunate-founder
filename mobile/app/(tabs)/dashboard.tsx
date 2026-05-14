import { useEffect, useRef, useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, Modal,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useStore } from "../../src/lib/store";
import { useAnalytics, usePools, useReports } from "../../src/hooks/useData";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/Card";
import { WaterBackground } from "../../src/components/WaterBackground";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";

const LIGHTNING_CHECK_INTERVAL_MS = 10 * 60 * 1000; // re-check every 10 min

function gradeColor(grade: string): { dot: string; bg: string; label: string } {
  if (grade === "A" || grade === "B") return { dot: "#16a34a", bg: "#dcfce7", label: "Good" };
  if (grade === "C")                  return { dot: "#ca8a04", bg: "#fef9c3", label: "OK" };
  return                                     { dot: "#dc2626", bg: "#fee2e2", label: "At Risk" };
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? COLORS.text }]}>{value}</Text>
    </View>
  );
}

interface LightningAlert {
  distanceMiles: number | null;
  source: string;
  alerts: string[];
}

export default function DashboardScreen() {
  const { user, company, lightningAlertsEnabled, lightningRadiusMiles } = useStore();
  const { data: analytics, isLoading, refetch, isRefetching } = useAnalytics();
  const { data: poolsData, isRefetching: poolsRefetching } = usePools();
  const { data: reportsData } = useReports();

  const [lightningAlert, setLightningAlert] = useState<LightningAlert | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Lightning check ──────────────────────────────────────────────────────────
  const checkLightning = async () => {
    if (!lightningAlertsEnabled) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const data = await api.get<{
        hasStrikes: boolean;
        strikeCount: number;
        avgDistanceMiles: number | null;
        source: string;
        alerts?: string[];
      }>(`/api/lightning?lat=${latitude}&lon=${longitude}`);

      if (!data.hasStrikes) {
        setLightningAlert(null);
        return;
      }

      // If we have distance data, filter by user's radius
      if (data.avgDistanceMiles !== null && data.avgDistanceMiles > lightningRadiusMiles) {
        setLightningAlert(null);
        return;
      }

      // Show alert — either within radius or distance unknown (condition-based detection)
      setLightningAlert({
        distanceMiles: data.avgDistanceMiles,
        source:        data.source,
        alerts:        data.alerts ?? [],
      });
    } catch {
      // Silent fail — don't interrupt the user's workflow for a network error
    }
  };

  useEffect(() => {
    // Check on mount
    checkLightning();

    // Re-check every 10 minutes while app is in foreground
    intervalRef.current = setInterval(checkLightning, LIGHTNING_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lightningAlertsEnabled, lightningRadiusMiles]);

  // ── Dashboard data ───────────────────────────────────────────────────────────
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats      = (analytics ?? {}) as any;
  const pools      = poolsData?.pools ?? [];
  const totalPools = pools.length;
  const reports    = (reportsData?.reports ?? []) as any[];
  const atRisk     = pools.filter((p: any) => p.profitabilityGrade && ["D", "F"].includes(p.profitabilityGrade));
  const recentReports = reports.slice(0, 3);

  const handleRefresh = async () => { await refetch(); };

  return (
    <>
      {/* ── Lightning Safety Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!lightningAlert}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={styles.lightningOverlay}>
          <View style={styles.lightningCard}>
            <Text style={styles.lightningEmoji}>⚡</Text>
            <Text style={styles.lightningTitle}>LIGHTNING NEARBY</Text>

            {lightningAlert?.distanceMiles != null ? (
              <Text style={styles.lightningDist}>
                ~{lightningAlert.distanceMiles} miles from your location
              </Text>
            ) : (
              <Text style={styles.lightningDist}>Active in your area</Text>
            )}

            <View style={styles.lightningSeparator} />

            <Text style={styles.lightningMsg}>
              It is <Text style={{ fontWeight: "800" }}>not safe</Text> to service pools during an electrical storm.{"\n\n"}
              Do not touch water or metal equipment. Seek shelter immediately and wait at least 30 minutes after the last strike.
            </Text>

            {lightningAlert?.alerts?.length ? (
              <View style={styles.lightningAlertBox}>
                <Text style={styles.lightningAlertText}>{lightningAlert.alerts[0]}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.lightningSafeBtn}
              onPress={() => setLightningAlert(null)}
            >
              <Text style={styles.lightningSafeBtnText}>I'm Safe — Inside Shelter</Text>
            </TouchableOpacity>

            <Text style={styles.lightningRecheckNote}>
              Will re-check in 10 minutes · Change radius in Settings
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching || poolsRefetching} onRefresh={handleRefresh} />}
      >
        {/* Water header */}
        <WaterBackground variant="surface" style={styles.waterHeader}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{user?.displayName ?? company?.name ?? "Pro"}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{company?.plan?.toUpperCase() ?? "STARTER"}</Text>
            </View>
          </View>
        </WaterBackground>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Active Pools"    value={String(totalPools)}                                  color={COLORS.primary} />
          <StatCard label="Monthly Revenue" value={`$${(stats.monthlyRevenue ?? 0).toLocaleString()}`}  color="#059669" />
          <StatCard label="Reports This Mo" value={String(stats.reportsThisMonth ?? 0)} />
          <StatCard label="Outstanding"     value={`$${(stats.outstanding ?? 0).toLocaleString()}`}     color={COLORS.warning} />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: "Service Guide", emoji: "🧭", route: "/service-flow"    },
            { label: "New Report",    emoji: "📋", route: "/(tabs)/reports"  },
            { label: "Add Pool",      emoji: "🏊", route: "/(tabs)/pools"    },
            { label: "Chemistry",     emoji: "⚗️", route: "/chemistry"       },
            { label: "Invoices",      emoji: "💳", route: "/invoices"        },
            { label: "AI Diagnose",   emoji: "🤖", route: "/diagnostic"      },
            { label: "Voice Mode",    emoji: "🎙️", route: "/voice"           },
            { label: "Evidence",      emoji: "🔐", route: "/evidence"        },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} onPress={() => router.push(a.route as any)}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pools needing attention */}
        {atRisk.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⚠️ Pools Needing Attention</Text>
            {atRisk.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => router.push({ pathname: "/pool-detail", params: { poolId: String(p.id) } } as any)}
              >
                <Card style={styles.alertCard}>
                  <View style={styles.alertRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertPoolName}>{p.name}</Text>
                      <Text style={styles.alertClient}>{p.clientName}</Text>
                    </View>
                    {(() => {
                      const gc = gradeColor(p.profitabilityGrade);
                      return (
                        <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                          <View style={[styles.gradeDot, { backgroundColor: gc.dot }]} />
                          <Text style={[styles.gradeLabel, { color: gc.dot }]}>{gc.label}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Today's route */}
        <Text style={styles.sectionTitle}>Today's Route</Text>
        <Card>
          <Text style={styles.routeTitle}>Start your route to see stops</Text>
          <Text style={styles.routeSub}>{totalPools} pools ready · GPS mileage tracking included</Text>
          <View style={styles.routeBtns}>
            <TouchableOpacity style={styles.startBtn} onPress={() => router.push("/(tabs)/routes")}>
              <Text style={styles.startBtnText}>🗺️  Start Route</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceBtn} onPress={() => router.push("/service-flow")}>
              <Text style={styles.serviceBtnText}>11-Step Flow</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent reports */}
        {recentReports.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Reports</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/reports")}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentReports.map((r: any) => {
              const pool = pools.find((p: any) => p.id === r.poolId);
              const date = new Date(r.servicedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <Card key={r.id} style={styles.reportCard}>
                  <View style={styles.reportRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportPool}>{pool?.name ?? "Pool"}</Text>
                      <Text style={styles.reportDate}>{date} · {pool?.clientName}</Text>
                      {r.techNotes && <Text style={styles.reportNotes} numberOfLines={1}>{r.techNotes}</Text>}
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: r.status === "complete" ? "#d1fae5" : "#fef3c7" },
                    ]}>
                      <Text style={[styles.statusText, { color: r.status === "complete" ? "#059669" : "#d97706" }]}>
                        {r.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  content:      { padding: 16, paddingTop: 0 },
  waterHeader:  { height: 160, marginBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  headerInner:  { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 20, paddingTop: 56 },
  greeting:     { fontSize: FONTS.sm, color: "rgba(255,255,255,0.75)" },
  name:         { fontSize: FONTS.xl, fontWeight: "800", color: "#fff", marginTop: 2 },
  badge:        { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  badgeText:    { fontSize: 11, fontWeight: "700", color: "#fff" },
  statsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  stat:         { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel:    { fontSize: 11, color: COLORS.textSecond, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue:    { fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 4 },
  sectionRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  sectionLink:  { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: "600" },
  actionsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  actionBtn:    { width: "22%", flexGrow: 1, backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionEmoji:  { fontSize: 22, marginBottom: 4 },
  actionLabel:  { fontSize: 11, fontWeight: "600", color: COLORS.textSecond, textAlign: "center" },
  alertCard:    { borderLeftWidth: 3, borderLeftColor: COLORS.danger, marginBottom: 8 },
  alertRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  alertPoolName:{ fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  alertClient:  { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  gradeBadge:   { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  gradeDot:     { width: 7, height: 7, borderRadius: 4 },
  gradeLabel:   { fontSize: 11, fontWeight: "700" },
  routeTitle:   { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  routeSub:     { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4, marginBottom: 12 },
  routeBtns:    { flexDirection: "row", gap: 8 },
  startBtn:     { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  serviceBtn:   { flex: 1, backgroundColor: COLORS.accent + "22", borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.accent },
  serviceBtnText:{ color: COLORS.accent, fontWeight: "700", fontSize: FONTS.base },
  reportCard:   { marginBottom: 8 },
  reportRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  reportPool:   { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  reportDate:   { fontSize: 12, color: COLORS.textSecond, marginTop: 1 },
  reportNotes:  { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  statusBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  statusText:   { fontSize: 10, fontWeight: "700" },
  bottomPad:    { height: 20 },

  // ── Lightning modal ───────────────────────────────────────────────────────
  lightningOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  lightningCard:       { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", alignItems: "center", borderTopWidth: 6, borderTopColor: "#dc2626" },
  lightningEmoji:      { fontSize: 56, marginBottom: 8 },
  lightningTitle:      { fontSize: 22, fontWeight: "900", color: "#dc2626", letterSpacing: 1, marginBottom: 6 },
  lightningDist:       { fontSize: FONTS.base, fontWeight: "600", color: "#7f1d1d", marginBottom: 16 },
  lightningSeparator:  { height: 1, backgroundColor: "#fee2e2", width: "100%", marginBottom: 16 },
  lightningMsg:        { fontSize: FONTS.base, color: COLORS.text, textAlign: "center", lineHeight: 24, marginBottom: 16 },
  lightningAlertBox:   { backgroundColor: "#fef2f2", borderRadius: RADIUS.md, padding: 12, marginBottom: 16, width: "100%" },
  lightningAlertText:  { fontSize: 12, color: "#991b1b", textAlign: "center" },
  lightningSafeBtn:    { backgroundColor: "#dc2626", borderRadius: RADIUS.md, padding: 16, width: "100%", alignItems: "center", marginBottom: 12 },
  lightningSafeBtnText:{ color: "#fff", fontWeight: "800", fontSize: FONTS.base },
  lightningRecheckNote:{ fontSize: 11, color: COLORS.textLight, textAlign: "center" },
});
