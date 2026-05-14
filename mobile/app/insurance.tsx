import { useState } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { router } from "expo-router";
import { usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { api } from "../src/lib/api";
import { Card } from "../src/components/Card";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

// Locked-in PoolPal Protect tiers
const TIERS = [
  { id: "essential", label: "Essential",   price: 39,  cap: "$5k",   deductible: "$250",  color: "#6b7280" },
  { id: "standard",  label: "Standard",    price: 79,  cap: "$15k",  deductible: "$500",  color: COLORS.primary },
  { id: "premium",   label: "Premium",     price: 149, cap: "$35k",  deductible: "$1k",   color: "#7c3aed" },
  { id: "estate",    label: "Estate Plus", price: 299, cap: "$75k",  deductible: "$1.5k", color: "#0891b2" },
  { id: "commercial",label: "Commercial",  price: 399, cap: "$50k",  deductible: "$2.5k", color: "#b45309" },
];

const ADD_ONS = [
  { id: "diving_board",      label: "Diving Board",      price: 15 },
  { id: "pop_up",            label: "Pop-Up Cleaners",   price: 25 },
  { id: "pool_cover",        label: "Pool Cover",        price: 10 },
  { id: "hot_tub",           label: "Hot Tub / Spa",     price: 20 },
  { id: "chemistry_damage",  label: "Chemistry Damage",  price: 15 },
];

interface EligibilityCheckItem {
  key:    string;
  label:  string;
  passed: boolean;
  detail: string;
}
interface EligibilityCheck {
  eligible:         boolean;
  score:            number;
  checks:           EligibilityCheckItem[];
  roadmap:          string[];
  recommendedTier?: string;
}

export default function InsuranceScreen() {
  const company   = useStore((s) => s.company);
  const { data: poolsData } = usePools();

  const [selectedPool,  setSelectedPool]  = useState<number | null>(null);
  const [eligibility,   setEligibility]   = useState<EligibilityCheck | null>(null);
  const [checking,      setChecking]      = useState(false);
  const [selectedTier,  setSelectedTier]  = useState<string | null>(null);
  const [addOns,        setAddOns]        = useState<Set<string>>(new Set());
  const [quoting,       setQuoting]       = useState(false);
  const [quote,         setQuote]         = useState<{ monthly: number; annual: number; savings: number } | null>(null);
  const [tab,           setTab]           = useState<"eligibility" | "quote" | "policy">("eligibility");

  const pools = poolsData?.pools ?? [];

  const checkEligibility = async () => {
    if (!selectedPool) { Alert.alert("Required", "Select a pool first."); return; }
    setChecking(true);
    setEligibility(null);
    try {
      const res = await api.post<EligibilityCheck>("/api/insurance/eligibility", {
        poolId:    selectedPool,
        companyId: company?.id,
      });
      setEligibility(res);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not check eligibility.");
    } finally {
      setChecking(false);
    }
  };

  const getQuote = async () => {
    if (!selectedTier) { Alert.alert("Required", "Select a coverage tier."); return; }
    setQuoting(true);
    try {
      const res = await api.post<any>(
        "/api/insurance/quote",
        {
          poolId:   selectedPool,
          tierKey:  selectedTier,
          annualPay: false,
        }
      );
      // Backend returns { finalPrice, savingsPerYear, ... } — map to display shape
      const monthly  = res.finalPrice ?? res.monthly ?? basePrice;
      const annual   = res.annualPay ? res.finalPrice : Math.round(monthly * 12 * 0.9 * 100) / 100;
      const savings  = res.savingsPerYear ?? Math.round(monthly * 12 * 0.1 * 100) / 100;
      setQuote({ monthly, annual, savings });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate quote.");
    } finally {
      setQuoting(false);
    }
  };

  const toggleAddOn = (id: string) => {
    setAddOns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setQuote(null);
  };

  const addOnTotal = Array.from(addOns).reduce((sum, id) => {
    return sum + (ADD_ONS.find((a) => a.id === id)?.price ?? 0);
  }, 0);
  const tier    = TIERS.find((t) => t.id === selectedTier);
  const basePrice = tier ? tier.price + addOnTotal : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PoolPal Protect</Text>
        <Text style={styles.sub}>Pool equipment insurance · Powered by PoolPal data</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["eligibility", "quote", "policy"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "eligibility" ? "Eligibility" : t === "quote" ? "Get Quote" : "My Policy"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── ELIGIBILITY TAB ── */}
        {tab === "eligibility" && (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>How PoolPal Protect works</Text>
              <Text style={styles.introText}>
                Unlike traditional insurance, PoolPal Protect is gated — only pools with a proven
                maintenance history qualify. This lets us offer dramatically lower rates.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Select Pool to Check</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {pools.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selectedPool === p.id && styles.chipActive]}
                  onPress={() => { setSelectedPool(p.id); setEligibility(null); }}
                >
                  <Text style={[styles.chipText, selectedPool === p.id && styles.chipTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.checkBtn, (checking || !selectedPool) && styles.checkBtnDisabled]}
              onPress={checkEligibility}
              disabled={checking || !selectedPool}
            >
              <Text style={styles.checkBtnText}>{checking ? "Checking..." : "Check Eligibility"}</Text>
            </TouchableOpacity>

            {eligibility && (
              <View style={styles.eligResult}>
                <View style={[
                  styles.eligBanner,
                  { backgroundColor: eligibility.eligible ? "#d1fae5" : "#fee2e2" },
                ]}>
                  <Text style={[
                    styles.eligBannerText,
                    { color: eligibility.eligible ? "#065f46" : "#991b1b" },
                  ]}>
                    {eligibility.eligible
                      ? "✓ This pool qualifies for PoolPal Protect!"
                      : "✗ This pool does not yet qualify"}
                  </Text>
                </View>

                {/* Gate checks */}
                {eligibility.checks.map((check) => (
                  <View key={check.key} style={styles.checkRow}>
                    <Text style={styles.checkMark}>{check.passed ? "✓" : "✗"}</Text>
                    <Text style={[styles.checkLabel, !check.passed && styles.checkLabelFail]}>
                      {check.label}
                    </Text>
                  </View>
                ))}

                {eligibility.eligible && (
                  <TouchableOpacity
                    style={styles.getQuoteBtn}
                    onPress={() => setTab("quote")}
                  >
                    <Text style={styles.getQuoteBtnText}>Get a Quote →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Requirements */}
            <Text style={styles.sectionLabel}>All 6 requirements</Text>
            {[
              "Pool+ subscriber for 90+ days",
              "Pro path: 3+ tech reports in 90 days  OR  DIY path: 12+ self-reports",
              "Equipment register fully completed",
              "Initial inspection passed (no excluded equipment)",
              "No claims in the last 24 months",
              "Policy not currently suspended",
            ].map((r, i) => (
              <View key={i} style={styles.reqRow}>
                <View style={styles.reqNum}>
                  <Text style={styles.reqNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.reqText}>{r}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── QUOTE TAB ── */}
        {tab === "quote" && (
          <>
            <Text style={styles.sectionLabel}>Choose Coverage Tier</Text>
            {TIERS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tierCard, selectedTier === t.id && { borderColor: t.color, borderWidth: 2 }]}
                onPress={() => { setSelectedTier(t.id); setQuote(null); }}
              >
                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, { color: t.color }]}>{t.label}</Text>
                  <Text style={styles.tierPrice}>${t.price}<Text style={styles.tierPriceSub}>/mo</Text></Text>
                </View>
                <View style={styles.tierDetails}>
                  <Text style={styles.tierDetail}>Cap: {t.cap}</Text>
                  <Text style={styles.tierDetail}>Deductible: {t.deductible}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionLabel}>Add-ons</Text>
            {ADD_ONS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.addOnRow, addOns.has(a.id) && styles.addOnRowActive]}
                onPress={() => toggleAddOn(a.id)}
              >
                <View style={[styles.addOnCheck, addOns.has(a.id) && styles.addOnCheckActive]}>
                  {addOns.has(a.id) && <Text style={styles.addOnCheckMark}>✓</Text>}
                </View>
                <Text style={styles.addOnLabel}>{a.label}</Text>
                <Text style={styles.addOnPrice}>+${a.price}/mo</Text>
              </TouchableOpacity>
            ))}

            {selectedTier && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewLabel}>Estimated monthly</Text>
                <Text style={styles.pricePreviewAmount}>${basePrice}<Text style={styles.pricePreviewSub}>/mo</Text></Text>
                <Text style={styles.pricePreviewAnnual}>${(basePrice * 12 * 0.9).toFixed(0)}/yr (save 10% annual)</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.quoteBtn, (!selectedTier || quoting) && styles.quoteBtnDisabled]}
              onPress={getQuote}
              disabled={!selectedTier || quoting}
            >
              <Text style={styles.quoteBtnText}>{quoting ? "Generating..." : "Get Official Quote"}</Text>
            </TouchableOpacity>

            {quote && (
              <View style={styles.quoteResult}>
                <Text style={styles.quoteResultTitle}>Your Quote</Text>
                <Text style={styles.quoteResultMonthly}>${quote.monthly}/mo</Text>
                <Text style={styles.quoteResultAnnual}>${quote.annual}/yr · saves ${quote.savings} vs monthly</Text>
                <TouchableOpacity
                  style={styles.activateBtn}
                  onPress={() => Alert.alert("Activate Policy", "This will open the subscription flow in your browser.")}
                >
                  <Text style={styles.activateBtnText}>Activate Policy</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── POLICY TAB ── */}
        {tab === "policy" && (
          <View style={styles.policyEmpty}>
            <Text style={styles.policyEmoji}>🛡️</Text>
            <Text style={styles.policyTitle}>No active policy</Text>
            <Text style={styles.policySub}>
              Check eligibility and get a quote to activate PoolPal Protect for your pools.
            </Text>
            <TouchableOpacity style={styles.getQuoteBtn} onPress={() => setTab("eligibility")}>
              <Text style={styles.getQuoteBtnText}>Check Eligibility →</Text>
            </TouchableOpacity>
          </View>
        )}
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
  tabBar:             { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab:                { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: "center", backgroundColor: COLORS.borderLight },
  tabActive:          { backgroundColor: COLORS.primary },
  tabText:            { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  tabTextActive:      { color: "#fff" },
  content:            { padding: 16, paddingBottom: 48 },
  introCard:          { backgroundColor: "#eff6ff", borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  introTitle:         { fontSize: FONTS.base, fontWeight: "700", color: COLORS.primary, marginBottom: 6 },
  introText:          { fontSize: FONTS.sm, color: COLORS.textSecond, lineHeight: 20 },
  sectionLabel:       { fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow:            { marginBottom: 12 },
  chip:               { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: "#fff" },
  chipActive:         { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:           { fontSize: FONTS.sm, color: COLORS.textSecond, fontWeight: "600" },
  chipTextActive:     { color: "#fff" },
  checkBtn:           { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginBottom: 16 },
  checkBtnDisabled:   { opacity: 0.5 },
  checkBtnText:       { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  eligResult:         { marginBottom: 16 },
  eligBanner:         { borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  eligBannerText:     { fontSize: FONTS.base, fontWeight: "700" },
  checkRow:           { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  checkMark:          { fontSize: 16, width: 20 },
  checkLabel:         { fontSize: FONTS.sm, color: COLORS.text, flex: 1 },
  checkLabelFail:     { color: "#dc2626" },
  getQuoteBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: 16 },
  getQuoteBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  reqRow:             { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  reqNum:             { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center", marginTop: 1 },
  reqNumText:         { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  reqText:            { fontSize: FONTS.sm, color: COLORS.textSecond, flex: 1, lineHeight: 20 },
  tierCard:           { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  tierHeader:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierName:           { fontSize: FONTS.base, fontWeight: "800" },
  tierPrice:          { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  tierPriceSub:       { fontSize: FONTS.sm, color: COLORS.textSecond },
  tierDetails:        { flexDirection: "row", gap: 16, marginTop: 6 },
  tierDetail:         { fontSize: FONTS.sm, color: COLORS.textSecond },
  addOnRow:           { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, marginBottom: 6, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  addOnRowActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "08" },
  addOnCheck:         { width: 22, height: 22, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  addOnCheckActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  addOnCheckMark:     { color: "#fff", fontSize: 12, fontWeight: "700" },
  addOnLabel:         { flex: 1, fontSize: FONTS.base, color: COLORS.text },
  addOnPrice:         { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  pricePreview:       { backgroundColor: COLORS.primary + "10", borderRadius: RADIUS.lg, padding: 16, alignItems: "center", marginVertical: 12 },
  pricePreviewLabel:  { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  pricePreviewAmount: { fontSize: 36, fontWeight: "800", color: COLORS.primary, marginTop: 4 },
  pricePreviewSub:    { fontSize: FONTS.base, fontWeight: "400" },
  pricePreviewAnnual: { fontSize: FONTS.sm, color: COLORS.textSecond, marginTop: 4 },
  quoteBtn:           { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: "center" },
  quoteBtnDisabled:   { opacity: 0.5 },
  quoteBtnText:       { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  quoteResult:        { backgroundColor: "#d1fae5", borderRadius: RADIUS.lg, padding: 20, marginTop: 16, alignItems: "center" },
  quoteResultTitle:   { fontSize: FONTS.sm, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 },
  quoteResultMonthly: { fontSize: 32, fontWeight: "800", color: "#065f46", marginTop: 6 },
  quoteResultAnnual:  { fontSize: FONTS.sm, color: "#065f46", marginTop: 4 },
  activateBtn:        { backgroundColor: "#059669", borderRadius: RADIUS.md, padding: 14, paddingHorizontal: 24, marginTop: 14 },
  activateBtnText:    { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  policyEmpty:        { alignItems: "center", paddingTop: 32 },
  policyEmoji:        { fontSize: 56, marginBottom: 12 },
  policyTitle:        { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  policySub:          { fontSize: FONTS.base, color: COLORS.textSecond, textAlign: "center", lineHeight: 22, marginBottom: 20 },
});
