// SQL to run in Neon:
// CREATE TABLE IF NOT EXISTS diagnostic_sessions (
//   id SERIAL PRIMARY KEY,
//   company_id INTEGER REFERENCES companies(id),
//   pool_id INTEGER REFERENCES pools(id),
//   user_uid TEXT,
//   user_role TEXT DEFAULT 'homeowner',
//   issue_key TEXT NOT NULL,
//   issue_label TEXT NOT NULL,
//   status TEXT DEFAULT 'open',
//   created_at TIMESTAMP DEFAULT NOW(),
//   resolved_at TIMESTAMP
// );
// CREATE TABLE IF NOT EXISTS diagnostic_messages (
//   id SERIAL PRIMARY KEY,
//   session_id INTEGER REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
//   role TEXT NOT NULL,
//   content TEXT NOT NULL,
//   structured JSONB,
//   created_at TIMESTAMP DEFAULT NOW()
// );

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getIssueType } from "@/lib/diagnostic/issue-types";

const Schema = z.object({
  issueKey:    z.string().min(1),
  poolId:      z.number().int().positive().optional(),
  userRole:    z.enum(["tech", "homeowner"]).default("homeowner"),
  description: z.string().optional(),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(userRole: string, issueLabelAndDesc: string): string {
  const roleCtx = userRole === "tech"
    ? "You are assisting a certified pool service technician. Use technical terminology. Skip basic explanations. Focus on diagnostic steps a pro would take."
    : "You are assisting a pool owner (not a professional). Use plain language. Avoid jargon. Prioritize safety. Recommend calling a pro when appropriate.";

  return `${roleCtx}

You are a pool diagnostic AI. The user has reported: ${issueLabelAndDesc}.

ALWAYS respond with a valid JSON object in this exact format (no markdown, no extra text):
{
  "diagnosis": "string — your current best assessment of the cause (1–2 sentences)",
  "severity": "low" | "medium" | "high" | "critical",
  "safeToSwim": true | false | null,
  "immediateActions": ["array of up to 3 things to do RIGHT NOW"],
  "diagnosticSteps": ["ordered array of investigation steps"],
  "likelyCauses": ["list of probable root causes, most likely first"],
  "estimatedCost": { "low": number, "high": number } | null,
  "callAPro": boolean,
  "callAProReason": "string or null",
  "followUpQuestion": "string — one clarifying question to refine diagnosis, or null if confident",
  "message": "string — conversational reply to show the user (2–3 sentences)"
}`;
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const issue = getIssueType(data.issueKey);
  if (!issue) return NextResponse.json({ error: "Unknown issue type" }, { status: 400 });

  const issueFull = `${issue.label}: ${issue.description}${data.description ? `. Additional context: ${data.description}` : ""}`;
  const systemPrompt = buildSystemPrompt(data.userRole, issueFull);

  const message = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 800,
    system:     systemPrompt,
    messages:   [{ role: "user", content: `I have a problem with my pool: ${issueFull}` }],
  });

  const raw = (message.content[0] as any).text as string;
  let structured: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    structured = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "AI response parse error", raw }, { status: 500 });
  }

  // Save session
  let sessionId: number | null = null;
  try {
    const sessionRes = await db.execute(sql`
      INSERT INTO diagnostic_sessions (user_uid, pool_id, issue_key, issue_label, user_role, status)
      VALUES (${auth.uid}, ${data.poolId ?? null}, ${data.issueKey}, ${issue.label}, ${data.userRole}, 'open')
      RETURNING id
    `);
    sessionId = (sessionRes.rows[0] as any)?.id ?? null;

    if (sessionId) {
      await db.execute(sql`
        INSERT INTO diagnostic_messages (session_id, role, content, structured)
        VALUES (${sessionId}, 'assistant', ${structured.message}, ${JSON.stringify(structured)}::jsonb)
      `);
    }
  } catch { /* table may not exist yet */ }

  return NextResponse.json({ sessionId, structured, issueLabel: issue.label, issueIcon: issue.icon });
}
