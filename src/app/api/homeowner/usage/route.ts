import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

// Track homeowner chemistry checks per week
// Uses a simple key-value table: userId + week → count

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const week = getWeekKey();

    // Check usage this week
    const result = await db.execute(
      sql`SELECT count FROM homeowner_usage WHERE user_id = ${userId} AND week = ${week} LIMIT 1`
    );

    const count = (result.rows[0] as any)?.count ?? 0;
    const FREE_LIMIT = 1;

    return NextResponse.json({
      checksThisWeek: count,
      checksRemaining: Math.max(0, FREE_LIMIT - count),
      weekResets: getNextMonday(),
    });
  } catch (err: any) {
    // Table may not exist yet — return defaults
    return NextResponse.json({ checksThisWeek: 0, checksRemaining: 1, weekResets: getNextMonday() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, isPro } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (isPro) return NextResponse.json({ allowed: true, checksRemaining: 999 });

    const week = getWeekKey();
    const FREE_LIMIT = 1;

    // Get current count
    const result = await db.execute(
      sql`SELECT count FROM homeowner_usage WHERE user_id = ${userId} AND week = ${week} LIMIT 1`
    );

    const current = (result.rows[0] as any)?.count ?? 0;

    if (current >= FREE_LIMIT) {
      return NextResponse.json({ allowed: false, checksRemaining: 0, upgradeRequired: true }, { status: 403 });
    }

    // Increment
    await db.execute(
      sql`INSERT INTO homeowner_usage (user_id, week, count)
          VALUES (${userId}, ${week}, 1)
          ON CONFLICT (user_id, week)
          DO UPDATE SET count = homeowner_usage.count + 1`
    );

    return NextResponse.json({ allowed: true, checksRemaining: FREE_LIMIT - current - 1 });
  } catch (err: any) {
    // If table doesn't exist, allow the check (graceful degradation)
    return NextResponse.json({ allowed: true, checksRemaining: 0 });
  }
}

function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now.getTime() + daysUntilMonday * 86400000);
  return monday.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
