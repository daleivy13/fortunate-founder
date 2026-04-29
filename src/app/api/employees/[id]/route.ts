import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const empRows = await db.execute(sql`SELECT * FROM employees WHERE id = ${id} LIMIT 1`);
  const employee = empRows.rows[0];
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch training events (table may not exist yet — graceful fallback)
  let events: any[] = [];
  try {
    const evRows = await db.execute(sql`
      SELECT * FROM tech_training_events WHERE employee_id = ${id} ORDER BY created_at DESC LIMIT 20
    `);
    events = evRows.rows as any[];
  } catch {}

  return NextResponse.json({ employee, events });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  const body = await req.json();
  const { experienceLevel, notes } = body;

  try {
    await db.execute(sql`
      UPDATE employees SET
        experience_level = COALESCE(${experienceLevel ?? null}, experience_level),
        notes            = COALESCE(${notes ?? null}, notes)
      WHERE id = ${id}
    `);

    // Log promotion event
    if (experienceLevel) {
      await db.execute(sql`
        INSERT INTO tech_training_events (employee_id, event_type, event_data)
        VALUES (${id}, 'level_changed', ${JSON.stringify({ to: experienceLevel })})
      `).catch(() => {});
    }
  } catch {
    // Experience columns not yet in DB — run SQL migration in Neon console
  }

  const empRows = await db.execute(sql`SELECT * FROM employees WHERE id = ${id} LIMIT 1`);
  return NextResponse.json({ employee: empRows.rows[0] });
}
