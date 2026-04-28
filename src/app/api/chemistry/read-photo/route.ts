import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const Schema = z.object({
  imageBase64:   z.string().min(1),
  poolId:        z.number().int().positive().optional(),
  volumeGallons: z.number().optional(),
});

const IDEAL = {
  freeChlorine:    { min: 1,   max: 4   },
  ph:              { min: 7.2, max: 7.6 },
  totalAlkalinity: { min: 80,  max: 120 },
  calciumHardness: { min: 150, max: 400 },
  cyanuricAcid:    { min: 30,  max: 80  },
  salt:            { min: 2700,max: 3400 },
};

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: data.imageBase64 },
        },
        {
          type: "text",
          text: `This is a photo of pool water test results. It may show:
- Test strips with color pads
- A liquid test kit with colored water in vials
- A digital test meter screen
- A printed test result sheet

Read ALL visible values and return ONLY a valid JSON object (no markdown, no extra text):
{
  "freeChlorine": number or null,
  "combinedChlorine": number or null,
  "ph": number or null,
  "totalAlkalinity": number or null,
  "calciumHardness": number or null,
  "cyanuricAcid": number or null,
  "salt": number or null,
  "waterTemp": number or null,
  "confidence": "high" or "medium" or "low",
  "notes": "string - any observations about image quality or unusual readings"
}`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as any).text as string;

  let readings: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    readings = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "Could not parse test results from photo", raw }, { status: 500 });
  }

  // Flag out-of-range values
  const flags: { param: string; value: number; status: "low"|"high" }[] = [];
  for (const [param, range] of Object.entries(IDEAL)) {
    const val = readings[param];
    if (typeof val === "number") {
      if (val < range.min) flags.push({ param, value: val, status: "low" });
      if (val > range.max) flags.push({ param, value: val, status: "high" });
    }
  }

  return NextResponse.json({ readings, flags, confidence: readings.confidence ?? "medium" });
}
