import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PRODUCTS, ChemicalCategory } from "@/lib/affiliate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as ChemicalCategory | null;

  let products = category
    ? PRODUCTS.filter((p) => p.category === category)
    : PRODUCTS;

  // Sort each retailer's option by price; flag the best deal overall
  products = [...products].sort((a, b) => {
    const aMin = Math.min(a.amazonPriceCents, a.lesliesPriceCents ?? Infinity);
    const bMin = Math.min(b.amazonPriceCents, b.lesliesPriceCents ?? Infinity);
    return aMin - bMin;
  });

  // Attach a bestDeal flag to the cheapest cross-retailer option per product
  const enriched = products.map((p) => {
    const amazonCheaper =
      p.lesliesPriceCents === null ||
      p.amazonPriceCents <= p.lesliesPriceCents;
    return {
      ...p,
      bestDeal: amazonCheaper ? ("amazon" as const) : ("leslies" as const),
    };
  });

  return NextResponse.json({ products: enriched });
}
