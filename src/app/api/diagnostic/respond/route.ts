import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const Schema = z.object({
  sessionId: z.number().int().positive(),
  message:   z.string().min(1).max(1000),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  // Fetch session + history
  let session: any = null;
  let history: any[] = [];
  try {
    const sRes = await db.execute(sql`SELECT * FROM diagnostic_sessions WHERE id = ${data.sessionId} LIMIT 1`);
    session = sRes.rows[0] as any;
    const mRes = await db.execute(sql`SELECT * FROM diagnostic_messages WHERE session_id = ${data.sessionId} ORDER BY created_at ASC`);
    history = mRes.rows as any[];
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({
      role:    m.role as "user" | "assistant",
      content: m.structured ? JSON.stringify(m.structured) : m.content,
    })),
    { role: "user", content: data.message },
  ];

  const systemPrompt = session.user_role === "tech"
    ? "You are a pool diagnostic AI assisting a certified pool technician. Continue the diagnosis in JSON format with fields: diagnosis, severity, safeToSwim, immediateActions, diagnosticSteps, likelyCauses, estimatedCost, callAPro, callAProReason, followUpQuestion, message. No markdown."
    : "You are a pool diagnostic AI assisting a pool owner. Continue the diagnosis in JSON format with fields: diagnosis, severity, safeToSwim, immediateActions, diagnosticSteps, likelyCauses, estimatedCost, callAPro, callAProReason, followUpQuestion, message. Use plain language. No markdown.";

  const aiMsg = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 700,
    system:     systemPrompt,
    messages,
  });

  const raw = (aiMsg.content[0] as any).text as string;
  let structured: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    structured = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    structured = { message: raw, diagnosis: null, severity: "medium", safeToSwim: null, immediateActions: [], diagnosticSteps: [], likelyCauses: [], callAPro: false, callAProReason: null, followUpQuestion: null, estimatedCost: null };
  }

  // Save user message + AI reply
  try {
    await db.execute(sql`
      INSERT INTO diagnostic_messages (session_id, role, content)
      VALUES (${data.sessionId}, 'user', ${data.message})
    `);
    await db.execute(sql`
      INSERT INTO diagnostic_messages (session_id, role, content, structured)
      VALUES (${data.sessionId}, 'assistant', ${structured.message}, ${JSON.stringify(structured)}::jsonb)
    `);
  } catch { /* non-fatal */ }

  return NextResponse.json({ structured });
}
