import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, chemistryReadings } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody, CreatePoolSchema } from "@/lib/validation";
import { cacheGetOrSet, cacheDel, CacheKeys } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = parseInt(searchParams.get("companyId") ?? "");
  if (!companyId || isNaN(companyId)) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  try {
    const data = await cacheGetOrSet(
      CacheKeys.pools(companyId),
      () => db.select().from(pools).where(eq(pools.companyId, companyId)).orderBy(desc(pools.createdAt)),
      300,
    );
    return NextResponse.json({ pools: data });
  } catch (err: any) {
    console.error("[api/pools GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { data, error: valErr } = validateBody(CreatePoolSchema, body);
  if (valErr) return valErr;

  try {
    const [inserted] = await db.insert(pools).values({ ...data, clientName: data.clientName || "", isActive: true }).returning();
    await cacheDel(CacheKeys.pools(data.companyId));
    return NextResponse.json({ pool: inserted }, { status: 201 });
  } catch (err: any) {
    console.error("[api/pools POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
