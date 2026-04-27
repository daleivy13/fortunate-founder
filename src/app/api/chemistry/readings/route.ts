import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { chemistryReadings } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CreateReadingSchema = z.object({
  poolId:           z.number().int().positive(),
  freeChlorine:     z.number().optional(),
  combinedChlorine: z.number().optional(),
  ph:               z.number().optional(),
  totalAlkalinity:  z.number().optional(),
  calciumHardness:  z.number().optional(),
  cyanuricAcid:     z.number().optional(),
  salt:             z.number().optional(),
  waterTemp:        z.number().optional(),
  notes:            z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { data, error: valErr } = validateBody(CreateReadingSchema, body);
  if (valErr) return valErr;

  try {
    const [reading] = await db
      .insert(chemistryReadings)
      .values({
        poolId:           data.poolId,
        techId:           auth?.uid ?? null,
        freeChlorine:     data.freeChlorine ?? null,
        combinedChlorine: data.combinedChlorine ?? null,
        ph:               data.ph ?? null,
        totalAlkalinity:  data.totalAlkalinity ?? null,
        calciumHardness:  data.calciumHardness ?? null,
        cyanuricAcid:     data.cyanuricAcid ?? null,
        salt:             data.salt ?? null,
        waterTemp:        data.waterTemp ?? null,
        notes:            data.notes ?? null,
      })
      .returning();

    return NextResponse.json({ reading }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  try {
    const rows = await db
      .select()
      .from(chemistryReadings)
      .where(eq(chemistryReadings.poolId, poolId))
      .orderBy(desc(chemistryReadings.recordedAt))
      .limit(50);

    return NextResponse.json({ readings: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
