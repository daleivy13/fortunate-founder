import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const Schema = z.object({
  imageBase64: z.string().optional(),
  imageUrl:    z.string().url().optional(),
  kitType:     z.enum(["strips", "liquid", "digital", "auto"]).default("auto"),
  poolId:      z.number().int().positive().optional(),
  saveReading: z.boolean().default(false),
}).refine(d => d.imageBase64 || d.imageUrl, { message: "Provide imageBase64 or imageUrl" });

const RANGES: Record<string, { min: number; max: number; hardMin: number; hardMax: number; unit: string }> = {
  freeChlorine:    { min: 1,    max: 4,    hardMin: 0,    hardMax: 20,   unit: "ppm" },
  combinedChlorine:{ min: 0,    max: 0.4,  hardMin: 0,    hardMax: 5,    unit: "ppm" },
  bromine:         { min: 2,    max: 6,    hardMin: 0,    hardMax: 20,   unit: "ppm" },
  ph:              { min: 7.2,  max: 7.6,  hardMin: 6.0,  hardMax: 9.0,  unit: ""    },
  totalAlkalinity: { min: 80,   max: 120,  hardMin: 0,    hardMax: 400,  unit: "ppm" },
  calciumHardness: { min: 150,  max: 400,  hardMin: 0,    hardMax: 1000, unit: "ppm" },
  cyanuricAcid:    { min: 30,   max: 80,   hardMin: 0,    hardMax: 300,  unit: "ppm" },
  salt:            { min: 2700, max: 3400, hardMin: 500,  hardMax: 8000, unit: "ppm" },
  waterTemp:       { min: 65,   max: 95,   hardMin: 32,   hardMax: 120,  unit: "°F"  },
};

const KIT_HINTS: Record<string, string> = {
  strips:  "The image shows a test strip card with color pads. Compare each pad color to the reference scale on the strip container.",
  liquid:  "The image shows liquid test vials filled with colored water. Each vial corresponds to a parameter.",
  digital: "The image shows a digital photometer or electronic tester screen with numeric readouts.",
  auto:    "The image may show test strips, liquid vials, a digital meter screen, or a printed test result sheet.",
};

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const imageContent = data.imageBase64
    ? { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: data.imageBase64 } }
    : { type: "image" as const, source: { type: "url", url: data.imageUrl! } as any };

  const kitHint = KIT_HINTS[data.kitType];

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: [
        imageContent,
        {
          type: "text",
          text: `${kitHint}

Carefully read ALL visible pool water chemistry values from this image and return ONLY a valid JSON object (no markdown, no extra text):
{
  "freeChlorine": number or null,
  "combinedChlorine": number or null,
  "bromine": number or null,
  "ph": number or null,
  "totalAlkalinity": number or null,
  "calciumHardness": number or null,
  "cyanuricAcid": number or null,
  "salt": number or null,
  "waterTemp": number or null,
  "detectedKitType": "strips" or "liquid" or "digital" or "sheet" or "unknown",
  "confidence": "high" or "medium" or "low",
  "warnings": ["string array of any concerns — blurry image, unusual values, hard to read pads, etc."],
  "notes": "string — observations about image quality or kit brand if visible"
}

Rules:
- Use null if a parameter is not visible or unreadable
- Do NOT guess values — if a color pad is ambiguous, return null
- waterTemp should be in °F
- For digital meters return the exact numeric display`,
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

  // Null out physically impossible values (keeps plausible out-of-range values for user review)
  for (const [param, range] of Object.entries(RANGES)) {
    const val = readings[param];
    if (typeof val === "number" && (val < range.hardMin || val > range.hardMax)) {
      readings[param] = null;
    }
  }

  // Build flags for values outside ideal ranges
  const flags: { param: string; value: number; status: "low" | "high"; unit: string }[] = [];
  for (const [param, range] of Object.entries(RANGES)) {
    const val = readings[param];
    if (typeof val === "number") {
      if (val < range.min) flags.push({ param, value: val, status: "low",  unit: range.unit });
      if (val > range.max) flags.push({ param, value: val, status: "high", unit: range.unit });
    }
  }

  // Optionally save to chemistry_readings
  if (data.saveReading && data.poolId) {
    await db.execute(sql`
      INSERT INTO chemistry_readings (
        pool_id, tech_id, free_chlorine, combined_chlorine, ph,
        total_alkalinity, calcium_hardness, cyanuric_acid, salt, water_temp,
        source
      ) VALUES (
        ${data.poolId}, ${auth.uid},
        ${readings.freeChlorine ?? null}, ${readings.combinedChlorine ?? null},
        ${readings.ph ?? null}, ${readings.totalAlkalinity ?? null},
        ${readings.calciumHardness ?? null}, ${readings.cyanuricAcid ?? null},
        ${readings.salt ?? null}, ${readings.waterTemp ?? null},
        'photo_scan'
      )
    `).catch(() =>
      db.execute(sql`
        INSERT INTO chemistry_readings (pool_id, tech_id, free_chlorine, ph, total_alkalinity)
        VALUES (${data.poolId}, ${auth.uid}, ${readings.freeChlorine ?? null}, ${readings.ph ?? null}, ${readings.totalAlkalinity ?? null})
      `)
    );
  }

  return NextResponse.json({
    readings,
    flags,
    confidence:      readings.confidence ?? "medium",
    detectedKitType: readings.detectedKitType ?? "unknown",
    warnings:        readings.warnings ?? [],
  });
}
