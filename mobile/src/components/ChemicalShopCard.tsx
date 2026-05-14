import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { COLORS, FONTS, RADIUS } from "../lib/theme";

interface Product {
  name:              string;
  brand:             string;
  priceRange:        string;
  amazonUrl:         string;
  lesliesUrl:        string | null;
  imageEmoji:        string;
  amazonPriceCents:  number;
  lesliesPriceCents: number | null;
  bestDeal:          "amazon" | "leslies";
}

function fmtPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function useProducts(category: string | null) {
  return useQuery<{ products: Product[] }>({
    queryKey: ["products", category],
    queryFn:  () => api.get(`/api/products${category ? `?category=${category}` : ""}`),
    staleTime: 24 * 60 * 60 * 1000, // prices are static — cache for 24h
    enabled:   !!category,
  });
}

// Maps chemistry screen chemical names → catalog category
function toCategory(chemical: string): string | null {
  const c = chemical.toLowerCase();
  if (c.includes("chlorine"))                                         return "chlorine";
  if (c.includes("shock"))                                            return "shock";
  if (c.includes("muriatic") || c.includes("soda ash"))              return "ph";
  if (c.includes("baking soda") || c.includes("alk"))                return "alkalinity";
  if (c.includes("stabilizer") || c.includes("cya"))                 return "stabilizer";
  if (c.includes("algae") || c.includes("algaecide"))                return "algae";
  return null;
}

interface Props {
  chemicalName: string;
}

export function ChemicalShopCard({ chemicalName }: Props) {
  const category = toCategory(chemicalName);
  const { data, isLoading } = useProducts(category);

  if (!category || isLoading || !data?.products?.length) return null;

  // Show the top 2 cheapest options
  const products = data.products.slice(0, 2);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Buy Now</Text>
      {products.map((p, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.emoji}>{p.imageEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.brand}>{p.brand}</Text>
            </View>
          </View>
          <View style={styles.prices}>
            <TouchableOpacity
              style={[styles.buyBtn, styles.amazonBtn, p.bestDeal === "amazon" && styles.bestDealBtn]}
              onPress={() => Linking.openURL(p.amazonUrl)}
            >
              {p.bestDeal === "amazon" && <Text style={styles.bestBadge}>Best</Text>}
              <Text style={styles.buyBtnText}>Amazon</Text>
              <Text style={styles.priceText}>{fmtPrice(p.amazonPriceCents)}</Text>
            </TouchableOpacity>

            {p.lesliesUrl && p.lesliesPriceCents !== null && (
              <TouchableOpacity
                style={[styles.buyBtn, styles.lesliesBtn, p.bestDeal === "leslies" && styles.bestDealBtn]}
                onPress={() => Linking.openURL(p.lesliesUrl!)}
              >
                {p.bestDeal === "leslies" && <Text style={styles.bestBadge}>Best</Text>}
                <Text style={styles.buyBtnText}>Leslie's</Text>
                <Text style={styles.priceText}>{fmtPrice(p.lesliesPriceCents)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  header:      { fontSize: 11, fontWeight: "700", color: COLORS.textSecond, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  row:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  info:        { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
  emoji:       { fontSize: 20 },
  name:        { fontSize: 12, fontWeight: "600", color: COLORS.text },
  brand:       { fontSize: 10, color: COLORS.textSecond },
  prices:      { flexDirection: "row", gap: 6 },
  buyBtn:      { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", minWidth: 68 },
  amazonBtn:   { backgroundColor: "#ff9900" },
  lesliesBtn:  { backgroundColor: "#0057a8" },
  bestDealBtn: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  bestBadge:   { fontSize: 8, fontWeight: "800", color: "#fff", backgroundColor: "#059669", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 2 },
  buyBtnText:  { fontSize: 10, fontWeight: "700", color: "#fff" },
  priceText:   { fontSize: 9, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
});
