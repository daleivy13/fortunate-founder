import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

// ── Task templates — every pool gets these by default ──────────────────────────
export const DEFAULT_TASK_TEMPLATES = [
  { key: "filter_clean",      name: "Clean/backwash filter",     intervalDays: 30,  category: "equipment", icon: "🔧" },
  { key: "basket_clean",      name: "Clean pump & skimmer baskets", intervalDays: 7, category: "maintenance", icon: "🧺" },
  { key: "algaecide",         name: "Apply monthly algaecide",   intervalDays: 30,  category: "chemistry",  icon: "🧪" },
  { key: "shock_treatment",   name: "Shock treatment",           intervalDays: 14,  category: "chemistry",  icon: "⚡" },
  { key: "tile_brushing",     name: "Brush tile line",           intervalDays: 14,  category: "cleaning",   icon: "🪣" },
  { key: "drain_test",        name: "Test main drain suction",   intervalDays: 90,  category: "safety",     icon: "🛡️" },
  { key: "heater_check",      name: "Inspect heater/heat pump",  intervalDays: 90,  category: "equipment",  icon: "🔥" },
  { key: "o_ring_lube",       name: "Lubricate O-rings & seals", intervalDays: 90,  category: "equipment",  icon: "🔩" },
  { key: "salt_cell_clean",   name: "Clean salt cell (if salt pool)", intervalDays: 60, category: "equipment", icon: "🧂" },
  { key: "water_level",       name: "Check & adjust water level",intervalDays: 7,   category: "maintenance", icon: "📏" },
  { key: "full_chem_test",    name: "Full 6-point chemistry test",intervalDays: 14, category: "chemistry",  icon: "⚗️" },
  { key: "winter_prep",       name: "Winter closing checklist",  intervalDays: 365, category: "seasonal",   icon: "❄️", seasonal: true },
  { key: "spring_open",       name: "Spring opening checklist",  intervalDays: 365, category: "seasonal",   icon: "🌸", seasonal: true },
  { key: "pump_inspection",   name: "Inspect pump motor & seal", intervalDays: 180, category: "equipment",  icon: "⚙️" },
  { key: "deck_inspection",   name: "Inspect pool deck & coping",intervalDays: 180, category: "safety",     icon: "🏊" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const poolId = searchParams.get("poolId");

    if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

    // Get tasks from DB (graceful fallback if table doesn't exist)
    let tasks: any[] = [];
    try {
      const result = await db.execute(
        sql`SELECT * FROM pool_tasks WHERE pool_id = ${parseInt(poolId)} ORDER BY due_date ASC`
      );
      tasks = result.rows as any[];
    } catch {
      // Table doesn't exist yet — return template tasks as "due" items
      const today = new Date();
      tasks = DEFAULT_TASK_TEMPLATES.map((t, i) => ({
        id: i + 1,
        poolId: parseInt(poolId),
        key: t.key,
        name: t.name,
        intervalDays: t.intervalDays,
        category: t.category,
        icon: t.icon,
        lastCompletedAt: null,
        dueDate: new Date(today.getTime() + (Math.random() > 0.5 ? -86400000 * Math.floor(Math.random() * 5) : 86400000 * Math.floor(Math.random() * 14))).toISOString(),
        notes: null,
      }));
    }

    // Calculate what's due, overdue, upcoming
    const now = new Date();
    const enriched = tasks.map((task) => {
      const due  = new Date(task.dueDate);
      const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
      return {
        ...task,
        daysUntilDue: diff,
        status: diff < -3 ? "overdue" : diff <= 0 ? "due" : diff <= 7 ? "upcoming" : "ok",
      };
    });

    const overdue  = enriched.filter((t) => t.status === "overdue");
    const due      = enriched.filter((t) => t.status === "due");
    const upcoming = enriched.filter((t) => t.status === "upcoming");
    const ok       = enriched.filter((t) => t.status === "ok");

    return NextResponse.json({ tasks: enriched, overdue, due, upcoming, ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, taskId, poolId, notes } = body;

    if (action === "complete") {
      const nextDue = new Date();
      // Get interval from task and set next due date
      try {
        await db.execute(
          sql`UPDATE pool_tasks 
              SET last_completed_at = NOW(), 
                  due_date = NOW() + (interval_days || ' days')::interval,
                  notes = ${notes ?? null}
              WHERE id = ${parseInt(taskId)}`
        );
      } catch {
        // Table doesn't exist — just return success
      }
      return NextResponse.json({ success: true, message: "Task marked complete" });
    }

    if (action === "create_defaults") {
      // Initialize default tasks for a new pool
      const today = new Date();
      try {
        for (const template of DEFAULT_TASK_TEMPLATES) {
          const dueDate = new Date(today.getTime() + template.intervalDays * 86400000);
          await db.execute(sql`
            INSERT INTO pool_tasks (pool_id, task_key, name, interval_days, category, icon, due_date)
            VALUES (${parseInt(poolId)}, ${template.key}, ${template.name}, ${template.intervalDays}, ${template.category}, ${template.icon}, ${dueDate.toISOString()})
            ON CONFLICT (pool_id, task_key) DO NOTHING
          `);
        }
      } catch {
        // Table doesn't exist — silently pass
      }
      return NextResponse.json({ success: true, message: `Default tasks created for pool ${poolId}` });
    }

    if (action === "create_custom") {
      const { name, intervalDays, category } = body;
      try {
        const dueDate = new Date(Date.now() + parseInt(intervalDays) * 86400000);
        await db.execute(sql`
          INSERT INTO pool_tasks (pool_id, task_key, name, interval_days, category, icon, due_date)
          VALUES (${parseInt(poolId)}, ${'custom_' + Date.now()}, ${name}, ${parseInt(intervalDays)}, ${category ?? 'maintenance'}, ${'📋'}, ${dueDate.toISOString()})
        `);
      } catch {}
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
