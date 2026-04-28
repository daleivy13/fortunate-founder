import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { clientRatings } from "@/backend/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token, rating, comment } = await req.json();

    if (!token || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Decode token: base64(reportId:poolId:companyId:companyName:poolName)
    let reportId: number | null = null;
    let poolId: number | null = null;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [rId, pId] = decoded.split(":");
      reportId = parseInt(rId) || null;
      poolId   = parseInt(pId) || null;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (!poolId) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    const [saved] = await db
      .insert(clientRatings)
      .values({
        poolId:   poolId,
        reportId: reportId ?? undefined,
        rating:   rating,
        comment:  comment || null,
      })
      .returning();

    return NextResponse.json({ success: true, rating: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
