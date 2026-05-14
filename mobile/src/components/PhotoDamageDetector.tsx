import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAnalyzePhoto } from "../hooks/useData";
import { useStore } from "../lib/store";
import { COLORS, FONTS, RADIUS } from "../lib/theme";

interface Props {
  poolId?: number;
  onResult?: (result: PhotoResult) => void;
}

export interface PhotoResult {
  imageUri:   string;
  base64:     string;
  findings:   string;
  severity:   "none" | "minor" | "moderate" | "severe";
  claimable:  boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  none:     "#059669",
  minor:    "#0891b2",
  moderate: "#d97706",
  severe:   "#dc2626",
};
const SEVERITY_BG: Record<string, string> = {
  none:     "#d1fae5",
  minor:    "#cffafe",
  moderate: "#fef3c7",
  severe:   "#fee2e2",
};

export function PhotoDamageDetector({ poolId, onResult }: Props) {
  const company    = useStore((s) => s.company);
  const analyze    = useAnalyzePhoto();
  const [uri,      setUri]      = useState<string | null>(null);
  const [result,   setResult]   = useState<PhotoResult | null>(null);

  const pickImage = async (source: "camera" | "library") => {
    const perm = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission denied", `${source === "camera" ? "Camera" : "Photos"} access is required.`);
      return;
    }

    const picked = source === "camera"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: true });

    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setUri(asset.uri);
    setResult(null);

    try {
      const res = await analyze.mutateAsync({
        imageBase64: asset.base64 ?? "",
        poolId,
        companyId:   company?.id,
      }) as any;

      const photoResult: PhotoResult = {
        imageUri:  asset.uri,
        base64:    asset.base64 ?? "",
        findings:  res.findings ?? res.description ?? "Analysis complete.",
        severity:  res.severity ?? "none",
        claimable: res.claimable ?? false,
      };
      setResult(photoResult);
      onResult?.(photoResult);
    } catch (err: any) {
      Alert.alert("Analysis failed", err.message ?? "Could not analyze photo.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PHOTO DAMAGE DETECTION</Text>
      <Text style={styles.sub}>AI (Claude Vision) will assess damage severity and insurance claimability</Text>

      {/* Action buttons */}
      <View style={styles.btns}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => pickImage("camera")}
          disabled={analyze.isPending}
        >
          <Text style={styles.btnEmoji}>📷</Text>
          <Text style={styles.btnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => pickImage("library")}
          disabled={analyze.isPending}
        >
          <Text style={styles.btnEmoji}>🖼️</Text>
          <Text style={styles.btnText}>Library</Text>
        </TouchableOpacity>
      </View>

      {/* Preview + loading */}
      {uri && (
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
      )}
      {analyze.isPending && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing with Claude Vision...</Text>
        </View>
      )}

      {/* Result */}
      {result && (
        <View style={[styles.resultCard, { borderLeftColor: SEVERITY_COLORS[result.severity] }]}>
          <View style={styles.resultHeader}>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_BG[result.severity] }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[result.severity] }]}>
                {result.severity.toUpperCase()}
              </Text>
            </View>
            {result.claimable && (
              <View style={styles.claimableBadge}>
                <Text style={styles.claimableText}>POTENTIALLY CLAIMABLE</Text>
              </View>
            )}
          </View>
          <Text style={styles.findings}>{result.findings}</Text>
          {result.claimable && (
            <Text style={styles.claimHint}>
              → Document this in your evidence ledger and contact support to start a claim.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { marginTop: 8 },
  label:          { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 4, letterSpacing: 0.5 },
  sub:            { fontSize: 12, color: COLORS.textLight, marginBottom: 10 },
  btns:           { flexDirection: "row", gap: 10 },
  btn:            { flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  btnEmoji:       { fontSize: 22 },
  btnText:        { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  preview:        { width: "100%", height: 180, borderRadius: RADIUS.md, marginTop: 12 },
  loadingRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  loadingText:    { fontSize: FONTS.sm, color: COLORS.textSecond },
  resultCard:     { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, marginTop: 12, borderLeftWidth: 3 },
  resultHeader:   { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  severityBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  severityText:   { fontSize: 11, fontWeight: "700" },
  claimableBadge: { backgroundColor: "#fef3c7", borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  claimableText:  { fontSize: 11, fontWeight: "700", color: "#d97706" },
  findings:       { fontSize: FONTS.sm, color: COLORS.text, lineHeight: 20 },
  claimHint:      { fontSize: 12, color: COLORS.primary, marginTop: 8, fontWeight: "600" },
});
