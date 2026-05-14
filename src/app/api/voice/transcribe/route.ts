import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | null;
  const poolId    = formData.get("poolId");
  const companyId = formData.get("companyId");

  if (!audioFile) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }

  let transcript = "";

  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const file = new File([audioBuffer], audioFile.name ?? "audio.m4a", { type: audioFile.type || "audio/m4a" });

      const result = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "en",
      });
      transcript = result.text;
    } catch (err: any) {
      return NextResponse.json({ error: `Transcription failed: ${err.message}` }, { status: 500 });
    }
  } else {
    return NextResponse.json(
      { error: "Voice transcription requires OPENAI_API_KEY. Add it to your .env.local to enable this feature." },
      { status: 503 }
    );
  }

  // Use Claude to extract chemistry readings and classify the action type
  let extracted: Record<string, any> = {};
  let detectedAction = "general";

  try {
    const extraction = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system:     "You extract pool chemistry values from service notes. Return only valid JSON, no markdown.",
      messages: [{
        role:    "user",
        content: `From this pool service note, extract chemistry readings and classify the action.
Return JSON only: {"freeChlorine": number|null, "ph": number|null, "alkalinity": number|null, "action": "chemistry"|"service_notes"|"damage"|"general"}

Note: "${transcript}"`,
      }],
    });

    const text   = (extraction.content[0] as any).text as string;
    const match  = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      extracted = {
        freeChlorine: parsed.freeChlorine ?? null,
        ph:           parsed.ph           ?? null,
        alkalinity:   parsed.alkalinity   ?? null,
      };
      detectedAction = parsed.action ?? "general";
    }
  } catch { /* extraction is best-effort */ }

  return NextResponse.json({ transcript, extracted, detectedAction });
}
