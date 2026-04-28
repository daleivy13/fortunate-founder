import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const Schema = z.object({
  imageUrl: z.string().url(),
  poolId:   z.number().int().positive().optional(),
  reportId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  // Download the image and convert to base64
  let imageBase64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
  try {
    const imgRes = await fetch(data.imageUrl);
    if (!imgRes.ok) throw new Error("Failed to download image");
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    if (contentType.includes("png"))  mediaType = "image/png";
    if (contentType.includes("webp")) mediaType = "image/webp";
    const buf = await imgRes.arrayBuffer();
    imageBase64 = Buffer.from(buf).toString("base64");
  } catch {
    return NextResponse.json({ error: "Could not load image for analysis" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: imageBase64 },
        },
        {
          type: "text",
          text: `You are a pool service expert analyzing pool photos. Look for issues including:
green/cloudy water, algae growth, cracked or damaged coping/decking,
broken or worn equipment (pumps, filters, heaters), debris buildup,
waterline stains, damaged tiles, leaks or water damage signs.

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "issues": [
    {
      "severity": "low|medium|high",
      "type": "string (e.g. Algae Growth, Equipment Damage)",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "overall_condition": "good|fair|poor",
  "upsell_opportunity": true|false,
  "upsell_description": "string or empty"
}`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as any).text as string;

  let analysis: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "AI analysis could not be parsed", raw }, { status: 500 });
  }

  return NextResponse.json({ analysis, poolId: data.poolId, reportId: data.reportId });
}
