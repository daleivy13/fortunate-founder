import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { userId, token, platform } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  try {
    await db.execute(sql`
      INSERT INTO push_tokens (user_id, token, platform, created_at)
      VALUES (${userId ?? auth.uid}, ${token}, ${platform ?? "expo"}, NOW())
      ON CONFLICT (token) DO UPDATE SET user_id = ${userId ?? auth.uid}, platform = ${platform ?? "expo"}
    `);
  } catch {
    // Table may not have unique constraint on token yet — try plain insert
    try {
      await db.execute(sql`
        INSERT INTO push_tokens (user_id, token, platform, created_at)
        VALUES (${userId ?? auth.uid}, ${token}, ${platform ?? "expo"}, NOW())
      `);
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ success: true });
}
