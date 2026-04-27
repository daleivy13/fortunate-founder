// Client notes / communication log per pool.
// Requires manual table creation in Neon:
// CREATE TABLE IF NOT EXISTS client_notes (
//   id SERIAL PRIMARY KEY,
//   pool_id INTEGER NOT NULL REFERENCES pools(id),
//   author_id TEXT,
//   note TEXT NOT NULL,
//   type TEXT DEFAULT 'note',
//   created_at TIMESTAMP DEFAULT NOW()
// );

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  try {
    const result = await db.execute(sql`
      SELECT * FROM client_notes WHERE pool_id = ${poolId} ORDER BY created_at DESC LIMIT 100
    `);
    return NextResponse.json({ notes: result.rows });
  } catch (err: any) {
    if (err.message?.includes("does not exist")) {
      return NextResponse.json({ notes: [] });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { poolId, note, type = "note" } = await req.json();
    if (!poolId || !note?.trim()) {
      return NextResponse.json({ error: "poolId and note required" }, { status: 400 });
    }

    const result = await db.execute(sql`
      INSERT INTO client_notes (pool_id, author_id, note, type)
      VALUES (${poolId}, ${auth?.uid ?? null}, ${note.trim()}, ${type})
      RETURNING *
    `);

    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "client_notes table not created yet. Run the SQL in Neon console.", sql: "CREATE TABLE IF NOT EXISTS client_notes (id SERIAL PRIMARY KEY, pool_id INTEGER NOT NULL REFERENCES pools(id), author_id TEXT, note TEXT NOT NULL, type TEXT DEFAULT 'note', created_at TIMESTAMP DEFAULT NOW());" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await db.execute(sql`DELETE FROM client_notes WHERE id = ${id}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
