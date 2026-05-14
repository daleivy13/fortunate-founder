import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { usePools } from "../../src/hooks/useData";
import { Card } from "../../src/components/Card";
import { WaterBackground } from "../../src/components/WaterBackground";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";
import { useStore } from "../../src/lib/store";
import { api } from "../../src/lib/api";

export default function RoutesScreen() {
  const { data: poolsData } = usePools();
  const user = useStore((s) => s.user);

  const [tracking, setTracking] = useState(false);
  const [miles,    setMiles]    = useState(0);
  const [stops,    setStops]    = useState<any[]>([]);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPos  = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (poolsData?.pools) {
      setStops(poolsData.pools.map((p: any, i: number) => ({
        ...p, order: i + 1, status: "pending",
      })));
    }
  }, [poolsData]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location access is required for GPS tracking.");
      return;
    }
    setTracking(true);
    lastPos.current = null;

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 20 },
      (loc) => {
        if (lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, loc.coords.latitude, loc.coords.longitude);
          setMiles((m) => m + d);
        }
        lastPos.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    );
  };

  const stopTracking = async () => {
    watchRef.current?.remove();
    setTracking(false);
    if (miles > 0.05 && user?.uid) {
      try {
        await api.post("/api/mileage", {
          userId:  user.uid,
          miles:   Math.round(miles * 100) / 100,
          date:    new Date().toISOString().split("T")[0],
          purpose: "Pool service route",
        });
        Alert.alert("Route saved", `${miles.toFixed(1)} miles logged for tax deduction.`);
      } catch {}
    }
    setMiles(0);
    lastPos.current = null;
  };

  const completeStop = (stopId: number) => {
    setStops((prev) => prev.map((s) => s.id === stopId ? { ...s, status: "done" } : s));
  };

  const pending = stops.filter((s) => s.status !== "done");
  const done    = stops.filter((s) => s.status === "done");

  return (
    <View style={styles.container}>
      {/* Header */}
      <WaterBackground variant="surface" style={styles.header}>
        <View>
          <Text style={styles.title}>Routes & GPS</Text>
          <Text style={styles.sub}>{done.length}/{stops.length} stops complete</Text>
        </View>
        <TouchableOpacity
          style={[styles.trackBtn, tracking ? styles.trackBtnStop : styles.trackBtnStart]}
          onPress={tracking ? stopTracking : startTracking}
        >
          <Text style={styles.trackBtnText}>
            {tracking ? `⏹  ${miles.toFixed(1)} mi` : "▶  Start GPS"}
          </Text>
        </TouchableOpacity>
      </WaterBackground>

      {/* IRS deduction bar */}
      {miles > 0 && (
        <View style={styles.deductBar}>
          <Text style={styles.deductText}>
            💰 Tax deduction: <Text style={styles.deductAmt}>${(miles * 0.67).toFixed(2)}</Text> ({miles.toFixed(1)} mi × $0.67 IRS rate)
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {stops.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No pools in route</Text>
            <Text style={styles.emptySub}>Add pools to build your route</Text>
          </View>
        ) : (
          <>
            {pending.map((stop, i) => (
              <Card key={stop.id} style={i === 0 ? styles.currentCard : undefined}>
                <View style={styles.stopRow}>
                  <View style={[styles.stopNum, i === 0 ? styles.stopNumCurrent : {}]}>
                    <Text style={[styles.stopNumText, i === 0 ? { color: "#fff" } : {}]}>{stop.order}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopClient}>{stop.clientName}</Text>
                    <Text style={styles.stopAddress} numberOfLines={1}>{stop.address}</Text>
                  </View>
                  {i === 0 && (
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => completeStop(stop.id)}
                    >
                      <Text style={styles.doneBtnText}>Done ✓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}

            {done.length > 0 && (
              <Text style={styles.doneLabel}>Completed ({done.length})</Text>
            )}
            {done.map((stop) => (
              <Card key={stop.id} style={styles.doneCard}>
                <View style={styles.stopRow}>
                  <Text style={styles.doneCheck}>✓</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stopName, styles.doneText]}>{stop.name}</Text>
                    <Text style={[styles.stopClient, styles.doneText]}>{stop.clientName}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flex: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, overflow: "hidden" },
  title:         { fontSize: FONTS.xl, fontWeight: "800", color: "#fff" },
  sub:           { fontSize: FONTS.sm, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  trackBtn:      { borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10 },
  trackBtnStart: { backgroundColor: COLORS.primary },
  trackBtnStop:  { backgroundColor: COLORS.danger },
  trackBtnText:  { color: "#fff", fontWeight: "700", fontSize: FONTS.sm },
  deductBar:     { backgroundColor: "#d1fae5", paddingHorizontal: 16, paddingVertical: 8 },
  deductText:    { fontSize: FONTS.sm, color: "#065f46" },
  deductAmt:     { fontWeight: "700" },
  list:          { padding: 16 },
  currentCard:   { borderColor: COLORS.primary, borderWidth: 1.5 },
  stopRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  stopNum:       { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.borderLight, alignItems: "center", justifyContent: "center" },
  stopNumCurrent:{ backgroundColor: COLORS.primary },
  stopNumText:   { fontWeight: "700", fontSize: FONTS.sm, color: COLORS.textSecond },
  stopName:      { fontSize: FONTS.base, fontWeight: "700", color: COLORS.text },
  stopClient:    { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 1 },
  stopAddress:   { fontSize: 12, color: COLORS.textLight },
  doneBtn:       { backgroundColor: "#d1fae5", borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  doneBtnText:   { color: "#065f46", fontWeight: "700", fontSize: FONTS.sm },
  doneLabel:     { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginTop: 8, marginBottom: 4 },
  doneCard:      { opacity: 0.6 },
  doneCheck:     { fontSize: 18, color: "#059669", marginRight: 4 },
  doneText:      { color: COLORS.textSecond },
  empty:         { alignItems: "center", paddingTop: 48 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: FONTS.lg, fontWeight: "700", color: COLORS.text },
  emptySub:      { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
});
