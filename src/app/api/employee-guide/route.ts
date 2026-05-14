import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

// ── Chemistry analysis → plain-language stoplights + dose wizard ──────────────
async function analyzeChemistry(
  readings: { fc?: number; ph?: number; alk?: number; cya?: number },
  poolVolume: number,
) {
  const V = poolVolume / 10000;

  const prompt = `You are a friendly pool chemistry coach helping a brand-new pool technician (possibly a high schooler on their first day). Analyze these water test readings and give simple, clear instructions.

Pool volume: ${poolVolume.toLocaleString()} gallons
Readings:
- Free Chlorine: ${readings.fc ?? "not tested"} ppm  (target: 3.0–5.0)
- pH: ${readings.ph ?? "not tested"}  (target: 7.4–7.6)
- Total Alkalinity: ${readings.alk ?? "not tested"} ppm  (target: 80–120)
- Stabilizer (CYA): ${readings.cya ?? "not tested"} ppm  (target: 30–50)

Respond ONLY with valid JSON matching this exact structure:
{
  "overallMessage": "short plain-English summary (1 sentence, no jargon)",
  "allGood": true/false,
  "stoplights": [
    {
      "name": "Chlorine",
      "value": ${readings.fc ?? null},
      "unit": "ppm",
      "status": "good|low|high|critical|untested",
      "emoji": "🟢 or 🟡 or 🔴",
      "headline": "PERFECT / A BIT LOW / TOO HIGH / etc",
      "message": "one friendly sentence explaining what this means for the pool"
    }
  ],
  "actions": [
    {
      "chemical": "exact product name (e.g. Liquid Chlorine)",
      "emoji": "🫧",
      "urgency": "high|medium|low",
      "amount": "human-friendly amount (e.g. 2 cups (16 fl oz) or 3 lbs)",
      "why": "one sentence a teenager would understand — why does this matter?",
      "howTo": [
        "Step 1: Make sure the pump is running",
        "Step 2: ...",
        "Step 3: ..."
      ],
      "safety": "safety warning if any (keep it short and important)"
    }
  ]
}

Rules:
- Only include stoplights for readings that were actually tested
- Only include actions for things that actually need changing
- If everything is fine, actions array is empty and allGood is true
- Amount must account for ${poolVolume.toLocaleString()} gallon pool size:
  * Liquid chlorine (10%): 13 fl oz per 1 ppm per 10k gal
  * Muriatic acid: 10 fl oz per 0.1 pH unit per 10k gal
  * Soda ash: 6 oz per 0.1 pH per 10k gal
  * Baking soda: 1.5 lbs per 10 ppm TA per 10k gal
  * CYA stabilizer: 1.3 lbs per 10 ppm per 10k gal
- Always sort actions: high urgency first
- howTo steps should be so clear a 10-year-old could follow them (but professional and safe)
- Safety tip is mandatory for acids and chlorine`;

  const res = await client.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 1200,
    messages:   [{ role: "user", content: prompt }],
  });

  const raw = (res.content[0] as any).text.trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd   = raw.lastIndexOf("}") + 1;
  return JSON.parse(raw.slice(jsonStart, jsonEnd));
}

// ── Contextual Q&A for on-the-job questions ───────────────────────────────────
async function answerQuestion(question: string, context: string) {
  const res = await client.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 400,
    system: `You are a friendly, patient pool service trainer helping a new employee — possibly their very first week on the job. They might be a high schooler. Answer questions simply and directly, like a helpful coworker would. No jargon. Keep it to 2-4 sentences max. If there's a safety risk, mention it first. Current task: "${context}".`,
    messages: [{ role: "user", content: question }],
  });
  return (res.content[0] as any).text.trim();
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { type } = body;

  try {
    if (type === "analyze") {
      const { readings, poolVolume = 15000 } = body;
      const result = await analyzeChemistry(readings, poolVolume);
      return NextResponse.json(result);
    }

    if (type === "ask") {
      const { question, context = "pool service" } = body;
      if (!question?.trim()) {
        return NextResponse.json({ error: "question is required" }, { status: 400 });
      }
      const answer = await answerQuestion(question, context);
      return NextResponse.json({ answer });
    }

    return NextResponse.json({ error: "type must be 'analyze' or 'ask'" }, { status: 400 });
  } catch (err: any) {
    console.error("[employee-guide]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
