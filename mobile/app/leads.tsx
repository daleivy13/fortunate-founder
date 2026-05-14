import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Linking,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";
import { useStore } from "../src/lib/store";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

const SERVICE_LABELS: Record<string, string> = {
  weekly_cleaning:  "Weekly Cleaning",
  chemicals:        "Chemical Balancing",
  algae_treatment:  "Algae Treatment",
  equipment_repair: "Equipment Repair",
  opening_closing:  "Opening / Closing",
  filter_service:   "Filter Service",
  salt_cell:        "Salt Cell Service",
  full_service:     "Full Service",
};

const BUDGET_LABELS: Record<string, string> = {
  under_100: "< $100/mo",
  "100_200": "$100–200/mo",
  "200_plus": "$200+/mo",
};

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs  = Math.floor(diff / 3600000);
  if (hrs < 1)   return "Just now";
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Lead {
  id:           number;
  city:         string | null;
  state:        string | null;
  zipCode:      string;
  serviceNeeds: string[];
  poolVolume:   number | null;
  poolType:     string | null;
  budget:       string | null;
  notes:        string | null;
  createdAt:    string;
  unlocked:     boolean;
  contactName:  string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export default function LeadsScreen() {
  const company = useStore((s) => s.company);
  const qc = useQueryClient();
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [recurringId, setRecurringId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery<{ leads: Lead[] }>({
    queryKey: ["leads", company?.id],
    queryFn:  () => api.get(`/api/leads?companyId=${company!.id}`),
    enabled:  !!company?.id,
  });

  const leads = data?.leads ?? [];

  const handleUnlock = async (lead: Lead) => {
    if (!company?.id) return;
    setUnlockingId(lead.id);
    try {
      const res = await api.post<{ checkoutUrl?: string; alreadyUnlocked?: boolean }>(
        `/api/leads/${lead.id}/unlock`,
        { companyId: company.id }
      );
      if (res.alreadyUnlocked) {
        qc.invalidateQueries({ queryKey: ["leads"] });
        return;
      }
      if (res.checkoutUrl) {
        await Linking.openURL(res.checkoutUrl);
        // Refresh leads after user returns from checkout
        setTimeout(() => qc.invalidateQueries({ queryKey: ["leads"] }), 2000);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not initiate unlock.");
    } finally {
      setUnlockingId(null);
    }
  };

  const handleRecurring = async (lead: Lead) => {
    if (!company?.id) return;
    Alert.alert(
      "Mark as Recurring Client",
      `This starts a $5/mo fee that grows with the relationship. You'll be taken to checkout.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            setRecurringId(lead.id);
            try {
              const res = await api.post<{ checkoutUrl?: string; message?: string }>(
                `/api/leads/${lead.id}/recurring`,
                { companyId: company.id }
              );
              if (res.message) {
                Alert.alert("Already set", res.message);
                return;
              }
              if (res.checkoutUrl) {
                await Linking.openURL(res.checkoutUrl);
              }
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Could not start recurring billing.");
            } finally {
              setRecurringId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pro Leads</Text>
        <Text style={styles.subtitle}>
          Homeowners near you looking for pool service. Unlock to see contact info.
        </Text>
      </View>

      <View style={styles.pricingCard}>
        <Text style={styles.pricingTitle}>💡 How it works</Text>
        <Text style={styles.pricingText}>
          <Text style={{ fontWeight: "700" }}>$10 one-time</Text> to unlock a lead's contact info.{"\n"}
          Mark as a recurring client to start a <Text style={{ fontWeight: "700" }}>$5/mo</Text> fee — grows with the relationship (capped at $25/mo).
        </Text>
      </View>

      {leads.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌊</Text>
          <Text style={styles.emptyTitle}>No leads yet</Text>
          <Text style={styles.emptyText}>
            When homeowners request service near you, they'll appear here.
          </Text>
        </View>
      )}

      {leads.map((lead) => (
        <View key={lead.id} style={[styles.leadCard, lead.unlocked && styles.leadCardUnlocked]}>
          {/* Location + time */}
          <View style={styles.leadHeader}>
            <View>
              <Text style={styles.leadLocation}>
                📍 {lead.city ? `${lead.city}, ${lead.state ?? ""}` : lead.zipCode}
              </Text>
              <Text style={styles.leadTime}>{timeSince(lead.createdAt)}</Text>
            </View>
            {lead.unlocked && (
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedBadgeText}>✓ Unlocked</Text>
              </View>
            )}
          </View>

          {/* Pool details */}
          <View style={styles.metaRow}>
            {lead.poolVolume && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>🏊 {(lead.poolVolume / 1000).toFixed(0)}k gal</Text>
              </View>
            )}
            {lead.poolType && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{lead.poolType}</Text>
              </View>
            )}
            {lead.budget && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{BUDGET_LABELS[lead.budget] ?? lead.budget}</Text>
              </View>
            )}
          </View>

          {/* Service needs */}
          <View style={styles.needsRow}>
            {lead.serviceNeeds.map((need) => (
              <View key={need} style={styles.needChip}>
                <Text style={styles.needChipText}>{SERVICE_LABELS[need] ?? need}</Text>
              </View>
            ))}
          </View>

          {/* Notes (only if unlocked) */}
          {lead.unlocked && lead.notes && (
            <Text style={styles.notes}>{lead.notes}</Text>
          )}

          {/* Contact info (unlocked) */}
          {lead.unlocked ? (
            <View style={styles.contactCard}>
              <Text style={styles.contactName}>{lead.contactName}</Text>
              {lead.contactPhone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${lead.contactPhone}`)}>
                  <Text style={styles.contactLink}>📞 {lead.contactPhone}</Text>
                </TouchableOpacity>
              )}
              {lead.contactEmail && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${lead.contactEmail}`)}>
                  <Text style={styles.contactLink}>✉️ {lead.contactEmail}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.recurringBtn, recurringId === lead.id && styles.btnDisabled]}
                onPress={() => handleRecurring(lead)}
                disabled={recurringId === lead.id}
              >
                <Text style={styles.recurringBtnText}>
                  {recurringId === lead.id ? "Loading…" : "🔄  Mark as Recurring Client ($5/mo)"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.unlockBtn, unlockingId === lead.id && styles.btnDisabled]}
              onPress={() => handleUnlock(lead)}
              disabled={unlockingId === lead.id}
            >
              <Text style={styles.unlockBtnText}>
                {unlockingId === lead.id ? "Loading…" : "🔓  Unlock Contact Info — $10"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={styles.footer}>Pull down to refresh leads</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  content:            { padding: 16, paddingBottom: 48 },
  header:             { paddingTop: 56, marginBottom: 16 },
  backBtn:            { marginBottom: 8 },
  backText:           { color: COLORS.primary, fontSize: FONTS.base, fontWeight: "600" },
  title:              { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  subtitle:           { fontSize: FONTS.sm, color: COLORS.textSecond, lineHeight: 20 },

  pricingCard:        { backgroundColor: "#eff6ff", borderRadius: RADIUS.md, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#bfdbfe" },
  pricingTitle:       { fontSize: FONTS.sm, fontWeight: "700", color: "#1d4ed8", marginBottom: 6 },
  pricingText:        { fontSize: FONTS.sm, color: "#1e40af", lineHeight: 20 },

  emptyState:         { alignItems: "center", paddingTop: 64 },
  emptyEmoji:         { fontSize: 48, marginBottom: 16 },
  emptyTitle:         { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  emptyText:          { fontSize: FONTS.sm, color: COLORS.textSecond, textAlign: "center", lineHeight: 20 },

  leadCard:           { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  leadCardUnlocked:   { borderColor: COLORS.primary },

  leadHeader:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  leadLocation:       { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  leadTime:           { fontSize: 12, color: COLORS.textSecond, marginTop: 2 },
  unlockedBadge:      { backgroundColor: "#d1fae5", borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  unlockedBadgeText:  { fontSize: 11, fontWeight: "700", color: "#065f46" },

  metaRow:            { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  metaChip:           { backgroundColor: "#f3f4f6", borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText:       { fontSize: 11, fontWeight: "600", color: COLORS.textSecond },

  needsRow:           { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  needChip:           { backgroundColor: "#eff6ff", borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  needChipText:       { fontSize: 11, fontWeight: "600", color: "#1d4ed8" },

  notes:              { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 12, lineHeight: 18, fontStyle: "italic" },

  contactCard:        { backgroundColor: "#f0fdf4", borderRadius: RADIUS.md, padding: 12, gap: 6 },
  contactName:        { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  contactLink:        { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: "600" },

  unlockBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 13, alignItems: "center" },
  unlockBtnText:      { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  recurringBtn:       { backgroundColor: "#7c3aed", borderRadius: RADIUS.md, padding: 11, alignItems: "center", marginTop: 8 },
  recurringBtnText:   { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  btnDisabled:        { opacity: 0.6 },

  footer:             { textAlign: "center", fontSize: 11, color: COLORS.textLight, marginTop: 8 },
});
