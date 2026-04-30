// SQL to run in Neon:
// ALTER TABLE service_reports
//   ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
//   ADD COLUMN IF NOT EXISTS verification_score INTEGER,
//   ADD COLUMN IF NOT EXISTS verification_flags JSONB,
//   ADD COLUMN IF NOT EXISTS tech_lat REAL,
//   ADD COLUMN IF NOT EXISTS tech_lng REAL;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { isAtLocation } from "@/lib/verification/gps";
import { extractPhotoMeta, checkPhotoFreshness, checkPhotoLocation } from "@/lib/verification/photo-meta";
import {
  checkDuplicateVisit, checkServiceDuration,
  checkGpsPresence, checkPhotoAge, aggregateFraudResult,
} from "@/lib/verification/fraud-checks";

const Schema = z.object({
  reportId:    z.number().int().positive(),
  imageBase64: z.string().min(1),
  techLat:     z.number().optional(),
  techLng:     z.number().optional(),
  startedAt:   z.string().optional(),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(Schema, await req.json());
  if (ve) return ve;

  // Fetch report + pool
  const repRes = await db.execute(sql`SELECT * FROM service_reports WHERE id = ${data.reportId} LIMIT 1`);
  const report = repRes.rows[0] as any;
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const poolRes = await db.execute(sql`SELECT lat, lng FROM pools WHERE id = ${report.pool_id} LIMIT 1`);
  const pool    = poolRes.rows[0] as any;

  // 1. AI photo content check
  const aiMsg = await client.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.imageBase64 } },
        {
          type: "text",
          text: `This photo was submitted as proof of a pool service visit. Verify it shows a real pool or pool equipment being serviced. Return ONLY valid JSON:
{
  "showsPool": true or false,
  "showsService": true or false,
  "confidence": "high" or "medium" or "low",
  "poolVisible": true or false,
  "equipmentVisible": true or false,
  "suspiciousContent": "string or null — describe anything suspicious",
  "notes": "string — brief description of what the photo shows"
}`,
        },
      ],
    }],
  });

  let photoAI: any = {};
  try {
    const raw = (aiMsg.content[0] as any).text;
    const m = raw.match(/\{[\s\S]*\}/);
    photoAI = JSON.parse(m ? m[0] : raw);
  } catch { /* non-fatal */ }

  // 2. Photo metadata checks
  const meta       = await extractPhotoMeta(data.imageBase64);
  const freshness  = checkPhotoFreshness(meta, 30);
  const locationOk = pool?.lat && pool?.lng
    ? checkPhotoLocation(meta, pool.lat, pool.lng, 300)
    : { matchesLocation: true, distanceFeet: null, hasGpsData: false };

  // 3. GPS presence check
  const gpsCheck = data.techLat && data.techLng && pool?.lat && pool?.lng
    ? isAtLocation({ lat: data.techLat, lng: data.techLng }, { lat: pool.lat, lng: pool.lng }, 200)
    : null;

  // 4. Duration check
  const durationFlag = data.startedAt
    ? checkServiceDuration(new Date(data.startedAt), new Date(), 10)
    : null;

  // 5. Duplicate visit check
  const dupFlag = await checkDuplicateVisit(auth.uid, report.pool_id, new Date(), 20);

  // Aggregate
  const ageFlag = checkPhotoAge(freshness.minutesAgo, 30);
  const gpsFlag = gpsCheck ? checkGpsPresence(gpsCheck.isAtLocation) : null;
  const result  = aggregateFraudResult([ageFlag, gpsFlag, durationFlag, dupFlag]);

  if (!photoAI.showsPool && !photoAI.showsService) {
    result.flags.push({ type: "invalid_photo", severity: "high", description: "AI could not confirm photo shows pool or pool service." });
    result.score = Math.min(result.score + 40, 100);
  }

  const finalDecision = result.score >= 60 ? "reject" : result.score >= 30 ? "review" : "clean";

  // Save to report
  await db.execute(sql`
    UPDATE service_reports SET
      verification_status = ${finalDecision},
      verification_score  = ${result.score},
      verification_flags  = ${JSON.stringify(result.flags)}::jsonb,
      tech_lat            = ${data.techLat ?? null},
      tech_lng            = ${data.techLng ?? null}
    WHERE id = ${data.reportId}
  `).catch(() => { /* column may not exist yet */ });

  return NextResponse.json({
    decision: finalDecision,
    score:    result.score,
    flags:    result.flags,
    photoAI,
    freshness,
    gpsCheck,
  });
}
