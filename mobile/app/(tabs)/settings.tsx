import { useState, useEffect } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Share } from "react-native";
import { useStore } from "../../src/lib/store";
import { signOut } from "../../src/lib/auth";
import { api } from "../../src/lib/api";
import { useRegisterPushToken } from "../../src/hooks/useData";
import { flushQueue, getQueueLength } from "../../src/hooks/useOfflineQueue";
import { Card } from "../../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";

const PLAN_LABELS: Record<string, string> = {
  starter:    "Starter",
  solo:       "Solo",
  growth:     "Growth",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  starter:    "#6b7280",
  solo:       COLORS.primary,
  growth:     "#7c3aed",
  enterprise: "#b45309",
};

export default function SettingsScreen() {
  const {
    user, company, setCompany, clear,
    lightningAlertsEnabled, lightningRadiusMiles,
    setLightningAlertsEnabled, setLightningRadiusMiles,
  } = useStore();
  const registerPush = useRegisterPushToken();

  const [saving,        setSaving]       = useState(false);
  const [displayName,   setDisplayName]  = useState(user?.displayName ?? "");
  const [companyName,   setCompanyName]  = useState(company?.name ?? "");
  const [notifications, setNotifications]= useState(false);
  const [queueCount,    setQueueCount]   = useState(0);
  const [flushing,      setFlushing]     = useState(false);

  const plan      = company?.plan ?? "starter";
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const planColor = PLAN_COLORS[plan] ?? COLORS.primary;

  useEffect(() => {
    getQueueLength().then(setQueueCount);
    // Hydrate lightning settings from persistent storage
    AsyncStorage.multiGet(["lightningEnabled", "lightningRadius"]).then((pairs) => {
      const enabled = pairs[0][1];
      const radius  = pairs[1][1];
      if (enabled !== null) setLightningAlertsEnabled(enabled === "true");
      if (radius  !== null) setLightningRadiusMiles(parseInt(radius));
    });
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    if (!value) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      setNotifications(false);
      Alert.alert("Permission denied", "Enable notifications in your device settings.");
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync();
      await registerPush.mutateAsync({
        userId:   user!.uid,
        token:    token.data,
        platform: "expo",
      });
    } catch {
      // Token registration is non-critical — don't bother the user
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert("Required", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/api/companies/${company?.id}`, {
        name: companyName.trim() || company?.name,
      }) as any;
      if (res?.company) setCompany(res.company);
      Alert.alert("Saved", "Profile updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleFlushQueue = async () => {
    setFlushing(true);
    const result = await flushQueue();
    setQueueCount(await getQueueLength());
    setFlushing(false);
    Alert.alert(
      "Queue flushed",
      `${result.flushed} requests synced.${result.failed ? ` ${result.failed} failed and dropped.` : ""}`
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            clear();
          },
        },
      ]
    );
  };

  const isHomeowner = company?.accountType === "homeowner";
  const isPro       = !isHomeowner;

  const NAV_ITEMS = [
    ...(isPro ? [{ label: "Service Guide (AI)",  emoji: "🧭", route: "/service-flow" }] : []),
    { label: "Equipment Register",   emoji: "🔧", route: "/equipment"    },
    { label: "Work Orders",          emoji: "📋", route: "/work-orders"  },
    { label: "Compliance Dashboard", emoji: "📊", route: "/compliance"   },
    { label: "Invoices",             emoji: "💳", route: "/invoices"     },
    { label: "Chemistry Log",        emoji: "⚗️", route: "/chemistry"    },
    // Revenue tools
    ...(isHomeowner ? [{ label: "Find a Pool Pro",  emoji: "🔍", route: "/find-a-pro" }] : []),
    ...(isPro       ? [{ label: "Service Leads",    emoji: "💼", route: "/leads"      }] : []),
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Plan badge */}
      <Card>
        <View style={styles.planRow}>
          <View>
            <Text style={styles.planLabel}>Current Plan</Text>
            <Text style={[styles.planName, { color: planColor }]}>{planLabel}</Text>
          </View>
          <View style={[styles.planBadge, { backgroundColor: planColor + "1a" }]}>
            <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel.toUpperCase()}</Text>
          </View>
        </View>
        {plan === "starter" && (
          <Text style={styles.upgradeHint}>Upgrade to unlock GPS tracking, PDF reports & more</Text>
        )}
      </Card>

      {/* Quick nav to key screens */}
      <Text style={styles.sectionLabel}>Tools</Text>
      <Card>
        {NAV_ITEMS.map((item, i) => (
          <View key={item.route}>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push(item.route as any)}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={styles.menuText}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            {i < NAV_ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      {/* Profile */}
      <Text style={styles.sectionLabel}>Profile</Text>
      <Card>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Your Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Company Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Pool service company"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldStatic}>{user?.email ?? "—"}</Text>
        </View>
        {company?.id && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Company ID</Text>
            <TouchableOpacity
              style={styles.companyIdRow}
              onPress={() => Share.share({ message: `Join my team on PoolPal! Company ID: ${company.id}` })}
            >
              <Text style={styles.companyIdValue}>{company.id}</Text>
              <Text style={styles.companyIdHint}>Tap to share with your team →</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
      </Card>

      {/* Preferences */}
      <Text style={styles.sectionLabel}>Preferences</Text>
      <Card>
        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>Push Notifications</Text>
            <Text style={styles.prefSub}>Route reminders & invoice alerts</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* Offline queue */}
      {queueCount > 0 && (
        <>
          <Text style={styles.sectionLabel}>Offline Queue</Text>
          <Card>
            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefTitle}>Pending Sync</Text>
                <Text style={styles.prefSub}>{queueCount} request{queueCount !== 1 ? "s" : ""} queued offline</Text>
              </View>
              <TouchableOpacity
                style={[styles.syncBtn, flushing && styles.saveBtnDisabled]}
                onPress={handleFlushQueue}
                disabled={flushing}
              >
                <Text style={styles.syncBtnText}>{flushing ? "Syncing..." : "Sync Now"}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </>
      )}

      {/* Lightning Safety */}
      <Text style={styles.sectionLabel}>⚡ Lightning Safety</Text>
      <Card>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Lightning Alerts</Text>
            <Text style={styles.prefSub}>Notifies you when lightning is detected nearby</Text>
          </View>
          <Switch
            value={lightningAlertsEnabled}
            onValueChange={(v) => {
              setLightningAlertsEnabled(v);
              AsyncStorage.setItem("lightningEnabled", String(v));
            }}
            trackColor={{ true: "#dc2626" }}
            thumbColor="#fff"
          />
        </View>

        {lightningAlertsEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={styles.radiusLabel}>Alert Radius</Text>
            <View style={styles.radiusRow}>
              {[1, 5, 10, 25].map((miles) => (
                <TouchableOpacity
                  key={miles}
                  style={[styles.radiusChip, lightningRadiusMiles === miles && styles.radiusChipActive]}
                  onPress={() => {
                    setLightningRadiusMiles(miles);
                    AsyncStorage.setItem("lightningRadius", String(miles));
                  }}
                >
                  <Text style={[styles.radiusChipText, lightningRadiusMiles === miles && styles.radiusChipTextActive]}>
                    {miles} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.radiusHint}>
              {lightningRadiusMiles === 5
                ? "Default — recommended for pool technicians"
                : lightningRadiusMiles < 5
                  ? "Tight radius — alerts only for very close strikes"
                  : "Wide radius — early warning, may alert more often"}
            </Text>
          </>
        )}
      </Card>

      {/* Account */}
      <Text style={styles.sectionLabel}>Account</Text>
      <Card>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert("Coming soon", "Password reset will be available in a future update.")}
        >
          <Text style={styles.menuEmoji}>🔑</Text>
          <Text style={styles.menuText}>Change Password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert("Coming soon", "Billing portal will be available in a future update.")}
        >
          <Text style={styles.menuEmoji}>💳</Text>
          <Text style={styles.menuText}>Billing & Subscription</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert("Coming soon", "Data export will be available in a future update.")}
        >
          <Text style={styles.menuEmoji}>📤</Text>
          <Text style={styles.menuText}>Export Data</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PoolPal AI · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  content:        { padding: 16, paddingTop: 56, paddingBottom: 40 },
  title:          { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.text, marginBottom: 20 },
  sectionLabel:   { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, marginTop: 20, textTransform: "uppercase", letterSpacing: 0.5 },
  planRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLabel:      { fontSize: FONTS.sm, color: COLORS.textSecond, marginBottom: 2 },
  planName:       { fontSize: FONTS.lg, fontWeight: "800" },
  planBadge:      { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  planBadgeText:  { fontSize: 11, fontWeight: "700" },
  upgradeHint:    { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 10 },
  field:          { marginBottom: 14 },
  fieldLabel:     { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  fieldInput:     { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text },
  fieldStatic:    { fontSize: FONTS.base, color: COLORS.textSecond, padding: 14, backgroundColor: COLORS.background, borderRadius: RADIUS.md },
  companyIdRow:   { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  companyIdValue: { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.primary, letterSpacing: 1 },
  companyIdHint:  { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: 4 },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  prefRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prefTitle:      { fontSize: FONTS.base, fontWeight: "600", color: COLORS.text },
  prefSub:        { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 2 },
  syncBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  syncBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  menuRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 },
  menuEmoji:      { fontSize: 18, width: 24 },
  menuText:       { fontSize: FONTS.base, color: COLORS.text, flex: 1 },
  menuArrow:      { fontSize: 20, color: COLORS.textSecond },
  divider:        { height: 1, backgroundColor: COLORS.borderLight },
  radiusLabel:    { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginTop: 14, marginBottom: 10 },
  radiusRow:      { flexDirection: "row", gap: 8 },
  radiusChip:     { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 9, alignItems: "center", backgroundColor: COLORS.background },
  radiusChipActive:    { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  radiusChipText:      { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond },
  radiusChipTextActive:{ color: "#fff" },
  radiusHint:     { fontSize: 11, color: COLORS.textLight, marginTop: 8, fontStyle: "italic" },
  signOutBtn:     { marginTop: 24, borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  signOutText:    { color: COLORS.danger, fontWeight: "700", fontSize: FONTS.base },
  version:        { textAlign: "center", fontSize: 12, color: COLORS.textLight, marginTop: 24 },
});
