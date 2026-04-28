import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const Schema = z.object({
  poolId:      z.number().int().positive(),
  currentRate: z.number().positive().optional(),
  newRate:     z.number().positive().optional(),
  reason:      z.string().min(1).max(500).optional(),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const rows = await db.execute(sql`SELECT * FROM pools WHERE id = ${data.poolId} LIMIT 1`);
  const pool = rows.rows[0] as any;
  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

  const currentRate   = data.currentRate ?? pool.monthly_rate ?? 150;
  const newRate       = data.newRate ?? Math.round(currentRate * 1.1);
  const reason        = data.reason ?? "rising costs of chemicals, fuel, and equipment maintenance";
  const effectiveDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Write a professional, warm, and brief email from a pool service company to a valued client explaining a rate increase.
Client name: ${pool.client_name}
Pool address: ${pool.address}
Current monthly rate: $${currentRate}
New monthly rate: $${newRate}
New rate effective: ${effectiveDate}
Reason: ${reason}

The email should:
- Be warm and personal, not corporate
- Briefly acknowledge the increase
- Mention 1-2 specific value points (quality service, reliability)
- Give 30 days notice
- End with appreciation for their continued business
- Be 150 words or less
- Include subject line at the top as 'Subject: ...'

Return ONLY the email text, no commentary.`,
    }],
  });

  const fullText = (message.content[0] as any).text as string;

  // Parse subject and body
  const subjectMatch = fullText.match(/^Subject:\s*(.+)/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : `Service Rate Update — Effective ${effectiveDate}`;
  const body    = fullText.replace(/^Subject:.+\n?/im, "").trim();

  return NextResponse.json({
    subject,
    body,
    emailTo:  pool.client_email,
    fullText,
  });
}
