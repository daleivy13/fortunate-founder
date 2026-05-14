import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { api } from "../src/lib/api";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const EVENT_ICONS: Record<string, string> = {
  service_report:      "📋",
  chemistry_reading:   "⚗️",
  equipment_inspection:"🔧",
  photo_damage:        "📷",
  verified_visit:      "📍",
  compliance_change:   "📊",
  claim_filed:         "🛡️",
  voice_report:        "🎙️",
};
const EVENT_COLORS: Record<string, string> = {
  service_report:      COLORS.primary,
  chemistry_reading:   "#0891b2",
  equipment_inspection:"#d97706",
  photo_damage:        "#dc2626",
  verified_visit:      "#059669",
  compliance_change:   "#7c3aed",
  claim_filed:         "#b45309",
  voice_report:        COLORS.accent,
};

interface EvidenceEvent {
  id:         number;
  eventType:  string;
  description:string;
  hash:       string;
  prevHash:   string | null;
  createdAt:  string;
  poolId?:    number;
  metadata?:  Record<string, any>;
}

export default function EvidenceScreen() {
  const company   = useStore((s) => s.company);
  const { data: poolsData } = usePools();

  const [events,      setEvents]      = useState<EvidenceEvent[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [poolFilter,  setPoolFilter]  = useState<number | null>(null);
  const [loaded,      setLoaded]      = useState(false);

  const pools = poolsData?.pools ?? [];

  const loadEvents = async (pId?: number) => {
    setLoading(true);
    try {
      const url = pId
        ? `/api/evidence?poolId=${pId}&companyId=${company?.id}`
        : `/api/evidence?companyId=${company?.id}`;
      const res = await api.get<{ events: EvidenceEvent[] }>(url);
      setEvents(res.events ?? []);
      setLoaded(true);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (pId: number | null) => {
    setPoolFilter(pId);
    loadEvents(pId ?? undefined);
  };

  const verifyChain = () => {
    for (let i = 1; i < events.length; i++) {
      if (events[i].prevHash !== events[i - 1].hash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true, brokenAt: -1 };
  };

  const chainVerification = loaded && events.length > 1 ? verifyChain() : null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Evidence Ledger</Text>
        <Text style={styles.sub}>Tamper-proof hash chain · Insurance proof</Text>
      </View>

      {/* Chain integrity badge */}
      {chainVerification && (
        <View style={[
          styles.chainBadge,
          { backgroundColor: chainVerification.valid ? "#d1fae5" : "#fee2e2" },
        ]}>
          <Text style={[styles.chainBadgeText, { color: chainVerification.valid ? "#065f46" : "#991b1b" }]}>
            {chainVerification.valid
              ? `🔒 Chain integrity verified · ${events.length} events`
              : `⚠️ Chain broken at event #${chainVerification.brokenAt + 1}`}
          </Text>
        </View>
      )}

      {/* Pool filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, !poolFilter && styles.filterChipActive]}
          onPress={() => handleFilterChange(null)}
        >
          <Text style={[styles.filterChipText, !poolFilter && styles.filterChipTextActive]}>All Pools</Text>
        </TouchableOpacity>
        {pools.map((p: any) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.filterChip, poolFilter === p.id && styles.filterChipActive]}
            onPress={() => handleFilterChange(p.id)}
          >
            <Text style={[styles.filterChipText, poolFilter === p.id && styles.filterChipTextActive]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadEvents(poolFilter ?? undefined)} />}
      >
        {!loaded ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔐</Text>
            <Text style={styles.emptyTitle}>Tamper-Proof Evidence Ledger</Text>
            <Text style={styles.emptySub}>
              Every service report, chemistry reading, GPS visit, and photo is recorded
              in a cryptographic hash chain — making your data tamper-proof for insurance claims.
            </Text>
            <TouchableOpacity style={styles.loadBtn} onPress={() => loadEvents()}>
              <Text style={styles.loadBtnText}>Load Evidence Ledger</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <Text style={styles.loadingText}>Loading events...</Text>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptySub}>Start logging service reports to build your evidence chain.</Text>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{events.length}</Text>
                <Text style={styles.statLabel}>Total Events</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {events.filter((e) => e.eventType === "service_report").length}
                </Text>
                <Text style={styles.statLabel}>Service Reports</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {events.filter((e) => e.eventType === "verified_visit").length}
                </Text>
                <Text style={styles.statLabel}>GPS Verified</Text>
              </View>
            </View>

            {/* Event timeline */}
            {events.map((evt, i) => {
              const icon  = EVENT_ICONS[evt.eventType]  ?? "📌";
              const color = EVENT_COLORS[evt.eventType] ?? COLORS.textSecond;
              const pool  = evt.poolId ? pools.find((p: any) => p.id === evt.poolId) : null;

              return (
                <View key={evt.id} style={styles.eventRow}>
                  {/* Timeline line */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.eventDot, { backgroundColor: color }]}>
                      <Text style={styles.eventDotIcon}>{icon}</Text>
                    </View>
                    {i < events.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Card */}
                  <View style={[styles.eventCard, { borderLeftColor: color }]}>
                    <View style={styles.eventHeader}>
                      <Text style={[styles.eventType, { color }]}>
                        {evt.eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      {pool && <Text style={styles.eventPool}>{pool.name}</Text>}
                    </View>
                    <Text style={styles.eventDesc}>{evt.description}</Text>
                    <Text style={styles.eventDate}>{formatDate(evt.createdAt)}</Text>
                    <Text style={styles.eventHash} numberOfLines={1}>
                      #{evt.hash.slice(0, 16)}…
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* What's recorded */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What gets recorded</Text>
          {[
            ["📋", "Every service report submitted"],
            ["⚗️", "All chemistry readings with timestamps"],
            ["📍", "GPS-verified pool visits"],
            ["📷", "Photo damage assessments"],
            ["📊", "Compliance status changes"],
            ["🎙️", "Voice-dictated service notes"],
          ].map(([icon, text]) => (
            <Text key={text} style={styles.infoItem}>{icon}  {text}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backText:           { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 8 },
  title:              { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text },
  sub:                { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  chainBadge:         { marginHorizontal: 16, borderRadius: RADIUS.md, padding: 10, marginBottom: 4 },
  chainBadgeText:     { fontSize: FONTS.sm, fontWeight: "700", textAlign: "center" },
  filterScroll:       { paddingHorizontal: 16, maxHeight: 50, marginBottom: 4 },
  filterChip:         { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: "#fff" },
  filterChipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:     { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  filterChipTextActive:{ color: "#fff" },
  content:            { padding: 16, paddingBottom: 40 },
  loadingText:        { textAlign: "center", color: COLORS.textSecond, marginTop: 24 },
  emptyState:         { alignItems: "center", paddingTop: 24 },
  emptyEmoji:         { fontSize: 48, marginBottom: 12 },
  emptyTitle:         { fontSize: FONTS.lg, fontWeight: "800", color: COLORS.text, marginBottom: 6, textAlign: "center" },
  emptySub:           { fontSize: FONTS.sm, color: COLORS.textSecond, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  loadBtn:            { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 14 },
  loadBtnText:        { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  statsRow:           { flexDirection: "row", gap: 8, marginBottom: 16 },
  statBox:            { flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, alignItems: "center" },
  statValue:          { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.primary },
  statLabel:          { fontSize: 11, color: COLORS.textSecond, marginTop: 2, textAlign: "center" },
  eventRow:           { flexDirection: "row", gap: 10, marginBottom: 0 },
  timelineLeft:       { alignItems: "center", width: 40 },
  eventDot:           { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  eventDotIcon:       { fontSize: 16 },
  timelineLine:       { flex: 1, width: 2, backgroundColor: COLORS.borderLight, marginVertical: 2 },
  eventCard:          { flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  eventHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  eventType:          { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  eventPool:          { fontSize: 11, color: COLORS.textSecond, fontWeight: "600" },
  eventDesc:          { fontSize: FONTS.sm, color: COLORS.text },
  eventDate:          { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  eventHash:          { fontSize: 10, color: COLORS.textLight, fontFamily: "monospace", marginTop: 2 },
  infoCard:           { backgroundColor: "#eff6ff", borderRadius: RADIUS.lg, padding: 14, marginTop: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  infoTitle:          { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.primary, marginBottom: 8 },
  infoItem:           { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 4 },
});
