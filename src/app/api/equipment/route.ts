import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { poolEquipment } from "@/backend/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CreateEquipmentSchema = z.object({
  poolId:              z.number().int().positive(),
  category:            z.enum(["pump","filter","heater","salt_cell","light","cleaner","other"]),
  brand:               z.string().max(100).optional(),
  model:               z.string().max(200).optional(),
  serialNumber:        z.string().max(100).optional(),
  installedAt:         z.string().optional(),
  warrantyExp:         z.string().optional(),
  lastServicedAt:      z.string().optional(),
  serviceIntervalDays: z.string().optional(),
  notes:               z.string().max(1000).optional(),
});

const UpdateEquipmentSchema = z.object({
  id:                  z.number().int().positive(),
  lastServicedAt:      z.string().optional(),
  serviceIntervalDays: z.number().int().optional(),
  brand:               z.string().max(100).optional(),
  model:               z.string().max(200).optional(),
  notes:               z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  // Use raw SQL to pick up maintenance columns (last_serviced_at, service_interval_days) if they exist
  let equipment: any[];
  try {
    const result = await db.execute(sql`
      SELECT * FROM pool_equipment WHERE pool_id = ${poolId} AND is_active = true ORDER BY created_at DESC
    `);
    equipment = result.rows as any[];
  } catch {
    equipment = await db.select().from(poolEquipment)
      .where(and(eq(poolEquipment.poolId, poolId), eq(poolEquipment.isActive, true)));
  }

  return NextResponse.json({ equipment });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(CreateEquipmentSchema, await req.json());
  if (ve) return ve;

  // Insert base fields via Drizzle, then set new maintenance columns via raw SQL if present
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

  if ((data.lastServicedAt || data.serviceIntervalDays) && item?.id) {
    try {
      await db.execute(sql`
        UPDATE pool_equipment SET
          last_serviced_at      = COALESCE(${data.lastServicedAt ? new Date(data.lastServicedAt) : null}::timestamp, last_serviced_at),
          service_interval_days = COALESCE(${data.serviceIntervalDays ? parseInt(data.serviceIntervalDays) : null}::int, service_interval_days)
        WHERE id = ${item.id}
      `);
    } catch { /* columns may not exist yet — safe to ignore */ }
  }

  return NextResponse.json({ equipment: item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(UpdateEquipmentSchema, await req.json());
  if (ve) return ve;

  const { id, lastServicedAt, serviceIntervalDays, ...rest } = data;

  // Standard fields via Drizzle
  if (Object.keys(rest).length > 0) {
    await db.update(poolEquipment).set(rest).where(eq(poolEquipment.id, id));
  }

  // Maintenance columns via raw SQL (added manually in Neon)
  if (lastServicedAt !== undefined || serviceIntervalDays !== undefined) {
    try {
      await db.execute(sql`
        UPDATE pool_equipment SET
          last_serviced_at      = COALESCE(${lastServicedAt ? new Date(lastServicedAt) : null}::timestamp, last_serviced_at),
          service_interval_days = COALESCE(${serviceIntervalDays ?? null}::int, service_interval_days)
        WHERE id = ${id}
      `);
    } catch { /* columns not yet created — skip gracefully */ }
  }

  const result = await db.execute(sql`SELECT * FROM pool_equipment WHERE id = ${id}`);
  return NextResponse.json({ equipment: result.rows[0] });
}

export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.update(poolEquipment).set({ isActive: false }).where(eq(poolEquipment.id, id));
  return NextResponse.json({ success: true });
}
