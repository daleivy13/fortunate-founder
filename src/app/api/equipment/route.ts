import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { poolEquipment } from "@/backend/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CATEGORY_KEYS = [
  "pump_standard","pump_variable_speed","filter_cartridge","filter_de","filter_sand",
  "heater_gas","heat_pump","salt_cell","chlorinator","automation_system",
  "pool_cleaner_robot","pool_cleaner_pressure","pool_cleaner_suction",
  "pool_light","pool_cover","uv_system","ozonator",
  // Legacy keys kept for backward compat
  "pump","filter","heater","light","cleaner","other",
] as const;

const CreateEquipmentSchema = z.object({
  poolId:              z.number().int().positive(),
  name:                z.string().max(200).optional(),
  category:            z.string().max(60),
  brand:               z.string().max(100).optional(),
  model:               z.string().max(200).optional(),
  serialNumber:        z.string().max(100).optional(),
  installedAt:         z.string().optional(),
  warrantyExp:         z.string().optional(),
  warrantyExpires:     z.string().optional(),
  lastServicedAt:      z.string().optional(),
  serviceIntervalDays: z.union([z.string(), z.number()]).optional(),
  condition:           z.enum(["excellent","good","fair","poor"]).optional(),
  notes:               z.string().max(1000).optional(),
  photos:              z.array(z.string()).optional(),
});

const UpdateEquipmentSchema = z.object({
  id:                  z.number().int().positive(),
  lastServicedAt:      z.string().optional(),
  serviceIntervalDays: z.number().int().optional(),
  brand:               z.string().max(100).optional(),
  model:               z.string().max(200).optional(),
  condition:           z.enum(["excellent","good","fair","poor"]).optional(),
  notes:               z.string().max(1000).optional(),
  photos:              z.array(z.string()).optional(),
  logService:          z.boolean().optional(),
});

function computeAlerts(eq: any) {
  const now = Date.now();
  const alerts: string[] = [];

  // Warranty expiring soon
  if (eq.warranty_exp || eq.warranty_expires) {
    const exp = new Date(eq.warranty_exp ?? eq.warranty_expires).getTime();
    const daysLeft = Math.floor((exp - now) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 30) alerts.push(`Warranty expires in ${daysLeft}d`);
    else if (daysLeft < 0) alerts.push("Warranty expired");
  }

  // Service overdue
  if (eq.last_serviced_at && eq.service_interval_days) {
    const nextService = new Date(eq.last_serviced_at).getTime() + parseInt(eq.service_interval_days) * 86400000;
    const daysLeft = Math.floor((nextService - now) / 86400000);
    if (daysLeft < 0) alerts.push(`Service overdue by ${Math.abs(daysLeft)}d`);
    else if (daysLeft <= 14) alerts.push(`Service due in ${daysLeft}d`);
  }

  return alerts;
}

function computeDaysLeft(eq: any): number | null {
  if (!eq.last_serviced_at || !eq.service_interval_days) return null;
  const nextService = new Date(eq.last_serviced_at).getTime() + parseInt(eq.service_interval_days) * 86400000;
  return Math.floor((nextService - Date.now()) / 86400000);
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const poolId    = searchParams.get("poolId");
  const companyId = searchParams.get("companyId");

  if (!poolId && !companyId) return NextResponse.json({ error: "poolId or companyId required" }, { status: 400 });

  let rows: any[];
  try {
    if (companyId) {
      const result = await db.execute(sql`
        SELECT pe.*, p.name AS pool_name, p.client_name, p.company_id
        FROM pool_equipment pe
        JOIN pools p ON pe.pool_id = p.id
        WHERE p.company_id = ${parseInt(companyId)} AND pe.is_active = true
        ORDER BY pe.created_at DESC
      `);
      rows = result.rows as any[];
    } else {
      const result = await db.execute(sql`
        SELECT * FROM pool_equipment WHERE pool_id = ${parseInt(poolId!)} AND is_active = true ORDER BY created_at DESC
      `);
      rows = result.rows as any[];
    }
  } catch {
    const conditions = companyId
      ? and(eq(poolEquipment.isActive, true))
      : and(eq(poolEquipment.poolId, parseInt(poolId!)), eq(poolEquipment.isActive, true));
    const base = await db.select().from(poolEquipment).where(conditions);
    rows = base;
  }

  const equipment = rows.map(eq => ({
    ...eq,
    poolId:    eq.pool_id ?? eq.poolId,
    poolName:  eq.pool_name,
    alerts:    computeAlerts(eq),
    daysLeft:  computeDaysLeft(eq),
  }));

  return NextResponse.json({ equipment });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(CreateEquipmentSchema, await req.json());
  if (ve) return ve;

  const warrantyDate = data.warrantyExp ?? data.warrantyExpires;
  const svcInterval  = data.serviceIntervalDays ? parseInt(String(data.serviceIntervalDays)) : null;

  const [item] = await db.insert(poolEquipment).values({
    poolId:       data.poolId,
    category:     data.category,
    brand:        data.brand ?? null,
    model:        data.model ?? null,
    serialNumber: data.serialNumber ?? null,
    installedAt:  data.installedAt ? new Date(data.installedAt) : null,
    warrantyExp:  warrantyDate ? new Date(warrantyDate) : null,
    notes:        data.notes ?? null,
  }).returning();

  if (item?.id) {
    try {
      await db.execute(sql`
        UPDATE pool_equipment SET
          name                  = COALESCE(${data.name ?? null}, name),
          last_serviced_at      = COALESCE(${data.lastServicedAt ? new Date(data.lastServicedAt) : null}::timestamp, last_serviced_at),
          service_interval_days = COALESCE(${svcInterval}::int, service_interval_days),
          condition             = COALESCE(${data.condition ?? null}, condition),
          photos                = COALESCE(${data.photos ? JSON.stringify(data.photos) : null}::jsonb, photos)
        WHERE id = ${item.id}
      `);
    } catch { /* extended columns not yet in DB — run SQL migration in Neon */ }
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

  // Extended columns via raw SQL
  try {
    await db.execute(sql`
      UPDATE pool_equipment SET
        last_serviced_at      = CASE WHEN ${data.logService ?? false} THEN NOW()
                                     WHEN ${lastServicedAt ?? null}::timestamp IS NOT NULL THEN ${lastServicedAt ? new Date(lastServicedAt) : null}::timestamp
                                     ELSE last_serviced_at END,
        service_interval_days = COALESCE(${serviceIntervalDays ?? null}::int, service_interval_days),
        condition             = COALESCE(${data.condition ?? null}, condition),
        photos                = COALESCE(${data.photos ? JSON.stringify(data.photos) : null}::jsonb, photos)
      WHERE id = ${id}
    `);
  } catch { /* extended columns not in DB yet */ }

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
