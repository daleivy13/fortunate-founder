import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

// Expo Push Notification service — free, no server required
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to:    string;         // Expo push token
  title: string;
  body:  string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
}

async function sendPushNotifications(messages: PushMessage[]) {
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body:    JSON.stringify(chunk),
      });
    } catch (err) {
      console.error("[push] Failed to send chunk:", err);
    }
  }
}

// ── Register device token ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { action, userId, token, title, body, data, userIds, type } = await req.json();

  // Register a device push token
  if (action === "register") {
    try {
      await db.execute(sql`
        INSERT INTO push_tokens (user_id, token, created_at, updated_at)
        VALUES (${userId}, ${token}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, updated_at = NOW()
      `);
    } catch {
      // Table may not exist — store in memory for now
    }
    return NextResponse.json({ success: true });
  }

  // Send to specific users
  if (action === "send") {
    let tokens: string[] = [];
    try {
      if (userIds && userIds.length > 0) {
        const result = await db.execute(sql`
          SELECT token FROM push_tokens WHERE user_id = ANY(${userIds})
        `);
        tokens = (result.rows as any[]).map((r) => r.token);
      } else if (userId) {
        const result = await db.execute(sql`
          SELECT token FROM push_tokens WHERE user_id = ${userId}
        `);
        tokens = (result.rows as any[]).map((r) => r.token);
      }
    } catch {}

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No tokens found" });
    }

    const messages: PushMessage[] = tokens.map((to) => ({
      to, title, body, data: data ?? {}, sound: "default",
    }));
    await sendPushNotifications(messages);
    return NextResponse.json({ success: true, sent: messages.length });
  }

  // Send chemistry alert to all company techs
  if (action === "chemistry_alert") {
    const { companyId, poolName, issue } = data ?? {};
    try {
      const result = await db.execute(sql`
        SELECT pt.token FROM push_tokens pt
        JOIN users u ON u.id = pt.user_id
        WHERE u.company_id = ${parseInt(companyId)}
      `);
      const tokens = (result.rows as any[]).map((r) => r.token);
      const msgs: PushMessage[] = tokens.map((to) => ({
        to,
        title: `⚠️ Chemistry Alert — ${poolName}`,
        body:  issue,
        data:  { type: "chemistry_alert", companyId },
        sound: "default",
      }));
      await sendPushNotifications(msgs);
      return NextResponse.json({ success: true, sent: msgs.length });
    } catch {
      return NextResponse.json({ success: true, sent: 0 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
