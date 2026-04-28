import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CreatePartSchema = z.object({
  companyId:       z.number().int().positive(),
  poolId:          z.number().int().positive().optional(),
  name:            z.string().min(1).max(200),
  partNumber:      z.string().max(100).optional(),
  quantityNeeded:  z.number().int().min(1).default(1),
  quantityOnHand:  z.number().int().min(0).default(0),
  unitCost:        z.number().min(0).optional(),
  status:          z.enum(["needed","ordered","installed","billed"]).default("needed"),
  notes:           z.string().max(1000).optional(),
});

const UpdatePartSchema = z.object({
  id:             z.number().int().positive(),
  status:         z.enum(["needed","ordered","installed","billed"]).optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  quantityNeeded: z.number().int().min(1).optional(),
  unitCost:       z.number().min(0).optional(),
  notes:          z.string().max(1000).optional(),
  name:           z.string().min(1).max(200).optional(),
  partNumber:     z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const poolId    = searchParams.get("poolId");

  if (!companyId && !poolId) return NextResponse.json({ error: "companyId or poolId required" }, { status: 400 });

  const rows = await db.execute(sql`
    SELECT p.*, pl.name AS pool_name, pl.client_name
    FROM parts p
    LEFT JOIN pools pl ON p.pool_id = pl.id
    WHERE
      ${poolId ? sql`p.pool_id = ${parseInt(poolId)}` : sql`p.company_id = ${parseInt(companyId!)}`}
    ORDER BY
      CASE p.status WHEN 'needed' THEN 1 WHEN 'ordered' THEN 2 WHEN 'installed' THEN 3 ELSE 4 END,
      p.created_at DESC
  `);

  return NextResponse.json({ parts: rows });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(CreatePartSchema, await req.json());
  if (ve) return ve;

  const result = await db.execute(sql`
    INSERT INTO parts (company_id, pool_id, name, part_number, quantity_needed, quantity_on_hand, unit_cost, status, notes)
    VALUES (
      ${data.companyId}, ${data.poolId ?? null}, ${data.name},
      ${data.partNumber ?? null}, ${data.quantityNeeded}, ${data.quantityOnHand},
      ${data.unitCost ?? null}, ${data.status}, ${data.notes ?? null}
    )
    RETURNING *
  `);

  return NextResponse.json({ part: result.rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(UpdatePartSchema, await req.json());
  if (ve) return ve;

  const { id, ...rest } = data;

  const result = await db.execute(sql`
    UPDATE parts SET
      status          = COALESCE(${rest.status ?? null}, status),
      name            = COALESCE(${rest.name ?? null}, name),
      part_number     = COALESCE(${rest.partNumber ?? null}, part_number),
      quantity_on_hand= COALESCE(${rest.quantityOnHand ?? null}::integer, quantity_on_hand),
      quantity_needed = COALESCE(${rest.quantityNeeded ?? null}::integer, quantity_needed),
      unit_cost       = COALESCE(${rest.unitCost ?? null}::real, unit_cost),
      notes           = COALESCE(${rest.notes ?? null}, notes),
      updated_at      = NOW()
    WHERE id = ${id}
    RETURNING *
  `);

  return NextResponse.json({ part: result.rows[0] });
}

export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.execute(sql`DELETE FROM parts WHERE id = ${id}`);
  return NextResponse.json({ success: true });
}
