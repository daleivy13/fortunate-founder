import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const CreateWOSchema = z.object({
  companyId:     z.number().int().positive(),
  poolId:        z.number().int().positive(),
  title:         z.string().min(1).max(200),
  description:   z.string().max(2000).optional(),
  priority:      z.enum(["low","normal","high","urgent"]).default("normal"),
  category:      z.enum(["repair","replacement","upgrade","inspection","other"]).default("repair"),
  estimatedCost: z.number().optional(),
  scheduledAt:   z.string().optional(),
  assignedTo:    z.string().optional(),
});

const UpdateWOSchema = z.object({
  id:          z.number().int().positive(),
  status:      z.enum(["pending","in_progress","complete","cancelled"]).optional(),
  actualCost:  z.number().optional(),
  techNotes:   z.string().max(2000).optional(),
  photos:      z.array(z.string()).optional(),
  parts:       z.string().optional(),
  completedAt: z.string().optional(),
  priority:    z.enum(["low","normal","high","urgent"]).optional(),
  assignedTo:  z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const poolId    = searchParams.get("poolId");

  const whereClause = poolId
    ? sql`WHERE wo.pool_id = ${parseInt(poolId)}`
    : companyId
    ? sql`WHERE wo.company_id = ${parseInt(companyId)}`
    : sql`WHERE 1=0`;

  const rows = await db.execute(sql`
    SELECT wo.*, p.name AS pool_name, p.client_name, p.address
    FROM work_orders wo
    JOIN pools p ON wo.pool_id = p.id
    ${whereClause}
    ORDER BY
      CASE wo.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      wo.created_at DESC
    LIMIT 100
  `);

  return NextResponse.json({ workOrders: rows });
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(CreateWOSchema, await req.json());
  if (ve) return ve;

  const result = await db.execute(sql`
    INSERT INTO work_orders (company_id, pool_id, title, description, priority, category, estimated_cost, scheduled_at, assigned_to)
    VALUES (
      ${data.companyId}, ${data.poolId}, ${data.title},
      ${data.description ?? null}, ${data.priority}, ${data.category},
      ${data.estimatedCost ?? null},
      ${data.scheduledAt ? new Date(data.scheduledAt) : null},
      ${data.assignedTo ?? null}
    )
    RETURNING *
  `);

  const wo = result.rows[0] as any;

  // Fire push notification to all company techs for urgent/high work orders
  if (data.priority === "urgent" || data.priority === "high") {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      fetch(`${baseUrl}/api/push`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:    "send",
          companyId: data.companyId,
          title:     `${data.priority === "urgent" ? "🚨" : "⚠️"} ${data.priority.toUpperCase()} Work Order`,
          body:      data.title,
          data:      { type: "work_order", id: wo.id },
        }),
      }).catch(() => {});
    } catch {}
  }

  return NextResponse.json({ workOrder: wo }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(UpdateWOSchema, await req.json());
  if (ve) return ve;

  const { id, photos, ...rest } = data;

  const updates: Record<string, any> = { ...rest };
  if (photos) updates.photos = JSON.stringify(photos);
  if (rest.completedAt) updates.completed_at = new Date(rest.completedAt);
  if (rest.actualCost !== undefined) updates.actual_cost = rest.actualCost;
  if (rest.techNotes !== undefined) updates.tech_notes = rest.techNotes;
  if (rest.assignedTo !== undefined) updates.assigned_to = rest.assignedTo;

  // Build SET clause dynamically
  const setClauses = Object.entries(updates)
    .filter(([k]) => !["completedAt","actualCost","techNotes","assignedTo"].includes(k))
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = '${v}'`);

  const updateResult = await db.execute(sql`
    UPDATE work_orders SET
      status       = COALESCE(${rest.status ?? null}, status),
      priority     = COALESCE(${rest.priority ?? null}, priority),
      actual_cost  = COALESCE(${rest.actualCost ?? null}, actual_cost),
      tech_notes   = COALESCE(${rest.techNotes ?? null}, tech_notes),
      assigned_to  = COALESCE(${rest.assignedTo ?? null}, assigned_to),
      photos       = COALESCE(${photos ? JSON.stringify(photos) : null}, photos),
      completed_at = COALESCE(${rest.completedAt ? new Date(rest.completedAt).toISOString() : null}::timestamp, completed_at)
    WHERE id = ${id}
    RETURNING *
  `);

  return NextResponse.json({ workOrder: updateResult.rows[0] });
}

export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.execute(sql`UPDATE work_orders SET status = 'cancelled' WHERE id = ${id}`);
  return NextResponse.json({ success: true });
}
