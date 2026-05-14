import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { signInEmail, signUpEmail } from "../../src/lib/auth";
import { WaterBackground } from "../../src/components/WaterBackground";
import { COLORS, FONTS, RADIUS } from "../../src/lib/theme";

export default function LoginScreen() {
  const [mode,     setMode]     = useState<"login" | "signup">("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signInEmail(email.trim(), password);
      } else {
        await signUpEmail(email.trim(), password);
      }
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WaterBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🌊</Text>
            </View>
            <Text style={styles.title}>PoolPal AI</Text>
            <Text style={styles.subtitle}>Professional Pool Management</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={submit}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === "login" ? "signup" : "login")}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <Text style={styles.switchLink}>
                  {mode === "login" ? "Sign up" : "Sign in"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </WaterBackground>
  );
}

const styles = StyleSheet.create({
  scroll:     { flexGrow: 1, justifyContent: "center", padding: 24 },
  header:     { alignItems: "center", marginBottom: 32 },
  logo:       { width: 72, height: 72, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  logoText:   { fontSize: 36 },
  title:      { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  subtitle:   { fontSize: FONTS.sm, color: "rgba(255,255,255,0.65)", marginTop: 4 },
  card:       { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: RADIUS.xl, padding: 24, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
  cardTitle:  { fontSize: FONTS.xl, fontWeight: "700", color: COLORS.text, marginBottom: 20 },
  label:      { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond, marginBottom: 6 },
  input:      { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 14, fontSize: FONTS.base, color: COLORS.text, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  btn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center", marginTop: 4 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: "#fff", fontSize: FONTS.base, fontWeight: "700" },
  switchRow:  { alignItems: "center", marginTop: 16 },
  switchText: { fontSize: FONTS.sm, color: COLORS.textSecond },
  switchLink: { color: COLORS.primary, fontWeight: "700" },
});
