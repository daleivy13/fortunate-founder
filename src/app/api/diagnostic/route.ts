import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an expert pool service technician AI assistant built into the PoolPal app.
You help pool service professionals diagnose issues, interpret chemistry readings, and troubleshoot equipment.

PoolPal Protocol compliance ranges:
- Free Chlorine: optimal 3.0–5.0 ppm, out of range <1 or >8
- pH: optimal 7.4–7.6, out of range <6.8 or >8.2
- Total Alkalinity: optimal 80–120 ppm, out of range <40 or >220

Respond conversationally in 2–4 sentences. Be direct and actionable. If chemistry values are mentioned, assess them against protocol ranges. Always prioritize safety.`;

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { sessionId, message, poolId, companyId, context } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  let history: { role: "user" | "assistant"; content: string }[] = [];
  let resolvedSessionId = sessionId;

  // Load existing session history
  if (sessionId) {
    try {
      const rows = await db.execute(sql`
        SELECT role, content FROM diagnostic_messages
        WHERE session_id = ${sessionId}
        ORDER BY created_at ASC
        LIMIT 20
      `);
      history = (rows.rows as any[]).map((r) => ({
        role:    r.role as "user" | "assistant",
        content: r.content,
      }));
    } catch { /* table may not exist */ }
  }

  history.push({ role: "user", content: message });

  const aiResponse = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system:     SYSTEM,
    messages:   history,
  });

  const reply = (aiResponse.content[0] as any).text as string;

  // Persist session
  try {
    if (!resolvedSessionId) {
      const sRes = await db.execute(sql`
        INSERT INTO diagnostic_sessions (user_uid, pool_id, issue_key, issue_label, user_role, status)
        VALUES (${auth.uid}, ${poolId ?? null}, 'free_form', 'Free-form chat', ${context ?? 'tech'}, 'open')
        RETURNING id
      `);
      resolvedSessionId = (sRes.rows[0] as any)?.id?.toString() ?? null;
    }

    if (resolvedSessionId) {
      await db.execute(sql`
        INSERT INTO diagnostic_messages (session_id, role, content)
        VALUES (${resolvedSessionId}, 'user', ${message}),
               (${resolvedSessionId}, 'assistant', ${reply})
      `);
    }
  } catch { /* tables may not exist yet — non-critical */ }

  return NextResponse.json({ reply, sessionId: resolvedSessionId });
}
