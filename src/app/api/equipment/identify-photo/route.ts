import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const Schema = z.object({
  imageBase64: z.string().min(1),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const message = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.imageBase64 } },
        {
          type: "text",
          text: `Identify the pool equipment shown in this image. Return ONLY a valid JSON object (no markdown):
{
  "category": one of: "pump", "filter", "heater", "chlorinator", "robot", "lights", "controller", "cleaner", "blower", "other",
  "brand": "string or null",
  "model": "string or null",
  "estimatedAge": "string or null (e.g. '5-10 years')",
  "condition": "excellent" or "good" or "fair" or "poor" or null,
  "confidence": "high" or "medium" or "low",
  "notes": "string — any visible damage, rust, leaks, error codes, or observations",
  "description": "2-sentence plain language description of what this is"
}`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as any).text as string;
  let result: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "Could not identify equipment", raw }, { status: 500 });
  }

  return NextResponse.json(result);
}
