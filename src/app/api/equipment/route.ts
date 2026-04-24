import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { poolEquipment } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CreateEquipmentSchema = z.object({
  poolId:       z.number().int().positive(),
  category:     z.enum(["pump","filter","heater","salt_cell","light","cleaner","other"]),
  brand:        z.string().max(100).optional(),
  model:        z.string().max(200).optional(),
  serialNumber: z.string().max(100).optional(),
  installedAt:  z.string().optional(),
  warrantyExp:  z.string().optional(),
  notes:        z.string().max(1000).optional(),
});

const UpdateEquipmentSchema = CreateEquipmentSchema.partial().extend({ id: z.number().int().positive() });

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  const equipment = await db.select().from(poolEquipment)
    .where(and(eq(poolEquipment.poolId, poolId), eq(poolEquipment.isActive, true)));

  return NextResponse.json({ equipment });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(CreateEquipmentSchema, await req.json());
  if (ve) return ve;

  const [item] = await db.insert(poolEquipment).values({
    poolId:       data.poolId,
    category:     data.category,
    brand:        data.brand ?? null,
    model:        data.model ?? null,
    serialNumber: data.serialNumber ?? null,
    installedAt:  data.installedAt ? new Date(data.installedAt) : null,
    warrantyExp:  data.warrantyExp ? new Date(data.warrantyExp) : null,
    notes:        data.notes ?? null,
  }).returning();

  return NextResponse.json({ equipment: item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(UpdateEquipmentSchema, await req.json());
  if (ve) return ve;

  const { id, poolId: _poolId, ...updates } = data;
  const [item] = await db.update(poolEquipment)
    .set({
      ...updates,
      installedAt: updates.installedAt ? new Date(updates.installedAt) : undefined,
      warrantyExp: updates.warrantyExp ? new Date(updates.warrantyExp) : undefined,
    })
    .where(eq(poolEquipment.id, id))
    .returning();

  return NextResponse.json({ equipment: item });
}

export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.update(poolEquipment).set({ isActive: false }).where(eq(poolEquipment.id, id));
  return NextResponse.json({ success: true });
}
